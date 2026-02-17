import { and, asc, desc, eq, gte, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { ProjectCard } from '$lib/types/project';
import { projects } from '../db/schema';
import type { ActivityFilter, ProjectFilters } from './filters';
import { activityFilterValues } from './filters';
import type * as dbSchema from '../db/schema';

const ACTIVE_WINDOW_DAYS = 30;
const RECENT_WINDOW_DAYS = 90;

const ACTIVITY_OPTIONS: ActivityFilter[] = [...activityFilterValues];

type ProjectsDb = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof dbSchema>;

type ProjectRow = typeof projects.$inferSelect;

export interface ProjectFilterFacets {
	languages: string[];
	engines: string[];
	stars: {
		min: number;
		max: number;
	};
	activities: ActivityFilter[];
}

export interface HomepageDataPayload {
	projects: ProjectCard[];
	facets: ProjectFilterFacets;
	filters: ProjectFilters;
}

const toProjectCard = (row: ProjectRow): ProjectCard => {
	return {
		name: row.name,
		slug: row.slug,
		description: row.description,
		tagline: row.tagline,
		stars: row.stars,
		contributors: row.contributors,
		lastCommitAt: row.lastCommitAt,
		forks: row.forks,
		watchers: row.watchers,
		language: row.language,
		engine: row.engine,
		license: row.license,
		topics: row.topics,
		healthScore: row.healthScore,
		websiteUrl: row.websiteUrl,
		repoUrl: row.repoUrl,
		faviconUrl: row.faviconUrl,
		screenshotUrl: row.screenshotUrl
	};
};

const buildActivityPredicate = (activity: ActivityFilter, now: Date) => {
	if (activity === 'all') {
		return undefined;
	}

	const activeCutoff = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
	const recentCutoff = new Date(now.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

	if (activity === 'active') {
		return gte(projects.lastCommitAt, activeCutoff);
	}

	if (activity === 'recent') {
		return and(gte(projects.lastCommitAt, recentCutoff), lt(projects.lastCommitAt, activeCutoff));
	}

	return or(isNull(projects.lastCommitAt), lt(projects.lastCommitAt, recentCutoff));
};

const buildFilterPredicate = (filters: ProjectFilters, now = new Date()) => {
	const predicates = [];

	if (filters.language) {
		predicates.push(eq(projects.language, filters.language));
	}

	if (filters.engine) {
		predicates.push(eq(projects.engine, filters.engine));
	}

	if (filters.starsMin !== null) {
		predicates.push(gte(projects.stars, filters.starsMin));
	}

	if (filters.starsMax !== null) {
		predicates.push(lte(projects.stars, filters.starsMax));
	}

	const activityPredicate = buildActivityPredicate(filters.activity, now);
	if (activityPredicate) {
		predicates.push(activityPredicate);
	}

	if (predicates.length === 0) {
		return undefined;
	}

	return and(...predicates);
};

export const listProjects = async (db: ProjectsDb, filters: ProjectFilters): Promise<ProjectCard[]> => {
	const where = buildFilterPredicate(filters);
	const baseQuery = db.select().from(projects);
	const filteredQuery = where ? baseQuery.where(where) : baseQuery;
	const rows = (await filteredQuery.orderBy(
		desc(projects.healthScore),
		desc(projects.stars),
		asc(projects.slug)
	)) as ProjectRow[];

	return rows.map(toProjectCard);
};

export const getProjectFilterFacets = async (db: ProjectsDb): Promise<ProjectFilterFacets> => {
	const [languageRows, engineRows, starsRows] = await Promise.all([
		db
			.selectDistinct({ value: projects.language })
			.from(projects)
			.where(isNotNull(projects.language))
			.orderBy(asc(projects.language)),
		db
			.selectDistinct({ value: projects.engine })
			.from(projects)
			.where(isNotNull(projects.engine))
			.orderBy(asc(projects.engine)),
		db
			.select({
				min: sql<number>`coalesce(min(${projects.stars}), 0)`,
				max: sql<number>`coalesce(max(${projects.stars}), 0)`
			})
			.from(projects)
	]);

	const starsRow = starsRows[0] as { min: number | string; max: number | string } | undefined;

	return {
		languages: (languageRows as Array<{ value: string | null }>)
			.map((row) => row.value)
			.filter((value): value is string => typeof value === 'string'),
		engines: (engineRows as Array<{ value: string | null }>)
			.map((row) => row.value)
			.filter((value): value is string => typeof value === 'string'),
		stars: {
			min: Number(starsRow?.min ?? 0),
			max: Number(starsRow?.max ?? 0)
		},
		activities: ACTIVITY_OPTIONS
	};
};

export const getHomepageData = async (
	db: ProjectsDb,
	filters: ProjectFilters
): Promise<HomepageDataPayload> => {
	const [projectRows, facets] = await Promise.all([listProjects(db, filters), getProjectFilterFacets(db)]);

	return {
		projects: projectRows,
		facets,
		filters
	};
};
