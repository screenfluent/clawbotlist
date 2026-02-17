import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getTableColumns } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';
import { getDb } from './client';
import { projects } from './schema';
import type { ProjectCard } from '../../types/project';

const requiredCardFields: Array<keyof ProjectCard> = [
	'name',
	'slug',
	'description',
	'tagline',
	'stars',
	'contributors',
	'lastCommitAt',
	'forks',
	'watchers',
	'language',
	'engine',
	'license',
	'topics',
	'healthScore',
	'websiteUrl',
	'repoUrl',
	'faviconUrl',
	'screenshotUrl'
];

describe('D1/Drizzle foundation', () => {
	it('defines project schema columns for card data + repo metadata', () => {
		const columns = Object.keys(getTableColumns(projects));

		expect(columns).toEqual(
			expect.arrayContaining([
				'name',
				'slug',
				'description',
				'tagline',
				'repoUrl',
				'stars',
				'contributors',
				'lastCommitAt',
				'forks',
				'watchers',
				'language',
				'engine',
				'license',
				'topics',
				'healthScore',
				'websiteUrl',
				'faviconUrl',
				'screenshotUrl',
				'createdAt',
				'updatedAt'
			])
		);
	});

	it('exports a typed project card shape', () => {
		const expectedFields = Object.keys({
			name: '',
			slug: '',
			description: '',
			tagline: '',
			stars: 0,
			contributors: 0,
			lastCommitAt: null,
			forks: 0,
			watchers: 0,
			language: '',
			engine: '',
			license: '',
			topics: [] as string[],
			healthScore: 0,
			websiteUrl: null,
			repoUrl: '',
			faviconUrl: null,
			screenshotUrl: null
		} satisfies Record<keyof ProjectCard, unknown>);

		expect(expectedFields).toEqual(expect.arrayContaining(requiredCardFields));
	});

	it('builds a db client from Cloudflare DB binding', () => {
		const fakeDb = {
			prepare: () => ({
				bind: () => ({
					run: async () => ({ results: [] })
				})
			})
		} as unknown as D1Database;

		const db = getDb({
			platform: {
				env: {
					DB: fakeDb
				}
			}
		});

		expect(db).toBeDefined();
		expect(typeof db.select).toBe('function');
	});

	it('creates SQL migration with required indexes', () => {
		const drizzleDir = join(process.cwd(), 'drizzle');
		expect(existsSync(drizzleDir)).toBe(true);

		const sqlFiles = readdirSync(drizzleDir)
			.filter((file: string) => file.endsWith('.sql'))
			.sort();
		expect(sqlFiles.length).toBeGreaterThan(0);

		const latestSql = readFileSync(join(drizzleDir, sqlFiles[sqlFiles.length - 1]), 'utf8');
		expect(latestSql).toContain('CREATE TABLE');
		expect(latestSql).toContain('projects');
		expect(latestSql).toContain('CREATE INDEX');
		expect(latestSql).toContain('projects_language_idx');
		expect(latestSql).toContain('projects_engine_idx');
		expect(latestSql).toContain('projects_stars_idx');
		expect(latestSql).toContain('projects_health_score_idx');
		expect(latestSql).toContain('projects_last_commit_at_idx');
	});
});
