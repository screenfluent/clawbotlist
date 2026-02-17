import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { getHomepageData, getProjectFilterFacets, listProjects } from './service';
import type { ProjectFilters } from './filters';

const migrationPath = join(process.cwd(), 'drizzle/0000_faulty_chat.sql');

const makeDb = () => {
	const sqlite = new Database(':memory:');
	sqlite.exec(readFileSync(migrationPath, 'utf8'));
	return {
		sqlite,
		db: drizzle(sqlite, { schema })
	};
};

const insertProject = (
	sqlite: Database.Database,
	row: {
		slug: string;
		language?: string | null;
		engine?: string | null;
		stars?: number;
		healthScore?: number;
		lastCommitAtDaysAgo?: number | null;
	}
) => {
	const stars = row.stars ?? 0;
	const healthScore = row.healthScore ?? 0;
	const nowSeconds = Math.floor(Date.now() / 1000);
	const lastCommitAt =
		row.lastCommitAtDaysAgo === null || row.lastCommitAtDaysAgo === undefined
			? null
			: nowSeconds - row.lastCommitAtDaysAgo * 24 * 60 * 60;

	sqlite
		.prepare(
			`INSERT INTO projects (
				name, slug, repo_owner, repo_name, repo_url,
				language, engine, topics,
				stars, contributors, forks, watchers,
				last_commit_at, health_score, created_at, updated_at
			) VALUES (?, ?, 'owner', ?, ?, ?, ?, '[]', ?, 0, 0, 0, ?, ?, unixepoch(), unixepoch())`
		)
		.run(
			row.slug,
			row.slug,
			row.slug,
			`https://github.com/owner/${row.slug}`,
			row.language ?? null,
			row.engine ?? null,
			stars,
			lastCommitAt,
			healthScore
		);
};

const defaultFilters: ProjectFilters = {
	language: null,
	engine: null,
	starsMin: null,
	starsMax: null,
	activity: 'all'
};

describe('homepage project service', () => {
	it('filters by language, engine, stars range, and activity bucket', async () => {
		const { sqlite, db } = makeDb();

		insertProject(sqlite, {
			slug: 'ts-active',
			language: 'TypeScript',
			engine: 'multi-llm',
			stars: 500,
			healthScore: 90,
			lastCommitAtDaysAgo: 2
		});
		insertProject(sqlite, {
			slug: 'ts-stale',
			language: 'TypeScript',
			engine: 'multi-llm',
			stars: 600,
			healthScore: 95,
			lastCommitAtDaysAgo: 200
		});
		insertProject(sqlite, {
			slug: 'py-active',
			language: 'Python',
			engine: 'multi-llm',
			stars: 700,
			healthScore: 88,
			lastCommitAtDaysAgo: 1
		});
		insertProject(sqlite, {
			slug: 'ts-other-engine',
			language: 'TypeScript',
			engine: 'anthropic-sdk',
			stars: 550,
			healthScore: 87,
			lastCommitAtDaysAgo: 3
		});

		const rows = await listProjects(db, {
			language: 'TypeScript',
			engine: 'multi-llm',
			starsMin: 400,
			starsMax: 550,
			activity: 'active'
		});

		expect(rows.map((row) => row.slug)).toEqual(['ts-active']);
	});

	it('sorts deterministically: health_score desc, stars desc, slug asc', async () => {
		const { sqlite, db } = makeDb();

		insertProject(sqlite, {
			slug: 'beta',
			healthScore: 100,
			stars: 200,
			lastCommitAtDaysAgo: 1
		});
		insertProject(sqlite, {
			slug: 'alpha',
			healthScore: 100,
			stars: 200,
			lastCommitAtDaysAgo: 1
		});
		insertProject(sqlite, {
			slug: 'gamma',
			healthScore: 100,
			stars: 150,
			lastCommitAtDaysAgo: 1
		});
		insertProject(sqlite, {
			slug: 'delta',
			healthScore: 90,
			stars: 999,
			lastCommitAtDaysAgo: 1
		});

		const rows = await listProjects(db, defaultFilters);

		expect(rows.map((row) => row.slug)).toEqual(['alpha', 'beta', 'gamma', 'delta']);
	});

	it('returns facets and active filters for homepage load payload', async () => {
		const { sqlite, db } = makeDb();

		insertProject(sqlite, {
			slug: 'proj-a',
			language: 'TypeScript',
			engine: 'multi-llm',
			stars: 10,
			lastCommitAtDaysAgo: 3
		});
		insertProject(sqlite, {
			slug: 'proj-b',
			language: 'Python',
			engine: 'anthropic-sdk',
			stars: 250,
			lastCommitAtDaysAgo: 65
		});
		insertProject(sqlite, {
			slug: 'proj-c',
			language: null,
			engine: null,
			stars: 50,
			lastCommitAtDaysAgo: null
		});

		const facets = await getProjectFilterFacets(db);
		expect(facets.languages).toEqual(['Python', 'TypeScript']);
		expect(facets.engines).toEqual(['anthropic-sdk', 'multi-llm']);
		expect(facets.stars).toEqual({ min: 10, max: 250 });

		const filters: ProjectFilters = {
			language: 'TypeScript',
			engine: null,
			starsMin: null,
			starsMax: null,
			activity: 'all'
		};
		const data = await getHomepageData(db, filters);

		expect(data.filters).toEqual(filters);
		expect(data.projects.every((project) => project.language === 'TypeScript')).toBe(true);
	});
});
