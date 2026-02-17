import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable(
	'projects',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		tagline: text('tagline'),
		description: text('description'),
		repoOwner: text('repo_owner').notNull(),
		repoName: text('repo_name').notNull(),
		repoUrl: text('repo_url').notNull(),
		websiteUrl: text('website_url'),
		faviconUrl: text('favicon_url'),
		screenshotUrl: text('screenshot_url'),
		language: text('language'),
		engine: text('engine'),
		license: text('license'),
		topics: text('topics', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
		stars: integer('stars').notNull().default(0),
		contributors: integer('contributors').notNull().default(0),
		forks: integer('forks').notNull().default(0),
		watchers: integer('watchers').notNull().default(0),
		lastCommitAt: integer('last_commit_at', { mode: 'timestamp' }),
		healthScore: integer('health_score').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
	},
	(table) => [
		uniqueIndex('projects_slug_unique').on(table.slug),
		index('projects_language_idx').on(table.language),
		index('projects_engine_idx').on(table.engine),
		index('projects_stars_idx').on(table.stars),
		index('projects_health_score_idx').on(table.healthScore),
		index('projects_last_commit_at_idx').on(table.lastCommitAt)
	]
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
