import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { parseSeedProjects } from './seed-schema';
import { buildSeedUpsertSql, mapSeedProjectToProjectRow } from './seed-import';

const seedFixturePath = join(process.cwd(), 'docs/seed-projects.json');
const migrationPath = join(process.cwd(), 'drizzle/0000_faulty_chat.sql');

const readSeedFixture = () => {
	const raw = readFileSync(seedFixturePath, 'utf8');
	return JSON.parse(raw) as unknown;
};

describe('seed import pipeline', () => {
	it('parses seed fixture with strict runtime checks', () => {
		const parsed = parseSeedProjects(readSeedFixture());

		expect(parsed.length).toBeGreaterThan(0);
		expect(parsed[0]).toHaveProperty('repo');
		expect(parsed[0]).toHaveProperty('topics');
	});

	it('fails loudly with actionable path details for malformed rows', () => {
		const parsed = parseSeedProjects(readSeedFixture());
		const malformed = [{ ...parsed[0], stars: 'oops-not-a-number' }];

		expect(() => parseSeedProjects(malformed)).toThrowError(/\[0\]\.stars/);
		expect(() => parseSeedProjects(malformed)).toThrowError(/finite number/i);
	});

	it('maps seed records into canonical project rows (slug + optional fields)', () => {
		const parsed = parseSeedProjects(readSeedFixture());
		const mapped = mapSeedProjectToProjectRow({
			...parsed[1],
			repo: 'Significant-Gravitas/AutoGPT',
			homepage: '',
			license: 'NOASSERTION',
			topics: ['AI', 'ai', '  ']
		});

		expect(mapped.slug).toBe('significant-gravitas-autogpt');
		expect(mapped.repoOwner).toBe('significant-gravitas');
		expect(mapped.repoName).toBe('autogpt');
		expect(mapped.repoUrl).toBe('https://github.com/significant-gravitas/autogpt');
		expect(mapped.websiteUrl).toBeNull();
		expect(mapped.license).toBeNull();
		expect(mapped.topics).toEqual(['ai']);
	});

	it('upserts idempotently without creating duplicates when re-imported', () => {
		const db = new Database(':memory:');
		db.exec(readFileSync(migrationPath, 'utf8'));

		const parsed = parseSeedProjects(readSeedFixture());
		const base = mapSeedProjectToProjectRow(parsed[0]);

		db.exec(buildSeedUpsertSql([base]));

		const initialCount = db.prepare('SELECT COUNT(*) as total FROM projects').get() as { total: number };
		expect(initialCount.total).toBe(1);

		const updated = {
			...base,
			stars: base.stars + 77,
			description: 'updated from seed import test'
		};

		db.exec(buildSeedUpsertSql([updated]));

		const finalCount = db.prepare('SELECT COUNT(*) as total FROM projects').get() as { total: number };
		expect(finalCount.total).toBe(1);

		const row = db
			.prepare('SELECT stars, description FROM projects WHERE slug = ?')
			.get(base.slug) as { stars: number; description: string | null };

		expect(row.stars).toBe(updated.stars);
		expect(row.description).toBe(updated.description);
	});
});
