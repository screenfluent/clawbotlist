import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseSeedProjects, type SeedProjectRecord } from './seed-schema';

const DEFAULT_SEED_FILE = 'docs/seed-projects.json';
const DEFAULT_D1_DATABASE = 'clawbotlist-db';

const REPO_PATTERN = /^(?<owner>[A-Za-z0-9_.-]+)\/(?<name>[A-Za-z0-9_.-]+)$/;

export interface SeedProjectDbRow {
	name: string;
	slug: string;
	tagline: string | null;
	description: string | null;
	repoOwner: string;
	repoName: string;
	repoUrl: string;
	websiteUrl: string | null;
	faviconUrl: string | null;
	screenshotUrl: string | null;
	language: string | null;
	engine: string | null;
	license: string | null;
	topics: string[];
	stars: number;
	contributors: number;
	forks: number;
	watchers: number;
	lastCommitAt: number | null;
	healthScore: number;
}

const toNullableString = (value: string | null | undefined): string | null => {
	if (value === undefined || value === null) {
		return null;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
};

const normalizeTopics = (topics: string[]): string[] => {
	return Array.from(new Set(topics.map((topic) => topic.trim().toLowerCase()).filter(Boolean)));
};

const normalizeSlug = (owner: string, name: string): string => {
	return `${owner}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
};

const parseRepository = (repo: string): { owner: string; name: string } => {
	const normalizedRepo = repo.trim();
	const match = normalizedRepo.match(REPO_PATTERN);

	if (!match?.groups?.owner || !match.groups.name) {
		throw new Error(
			`Invalid seed repository \`${repo}\`: expected <owner>/<name> (example: openclaw/openclaw)`
		);
	}

	return {
		owner: match.groups.owner.toLowerCase(),
		name: match.groups.name.toLowerCase()
	};
};

const toSqlString = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const toSqlNullableString = (value: string | null): string => {
	return value === null ? 'NULL' : toSqlString(value);
};

const toSqlNumber = (value: number): string => {
	if (!Number.isFinite(value)) {
		throw new Error(`Invalid numeric value for SQL statement: ${String(value)}`);
	}

	return `${Math.trunc(value)}`;
};

const toSqlNullableNumber = (value: number | null): string => {
	return value === null ? 'NULL' : toSqlNumber(value);
};

/**
 * Topics are persisted as JSON text in `projects.topics`.
 * This keeps import simple and still queryable with SQLite JSON functions (`json_each`, `json_extract`).
 */
export const mapSeedProjectToProjectRow = (record: SeedProjectRecord): SeedProjectDbRow => {
	const { owner, name } = parseRepository(record.repo);
	const pushedAtMs = Date.parse(record.pushed_at);

	if (Number.isNaN(pushedAtMs)) {
		throw new Error(`Invalid pushed_at for repo ${record.repo}: ${record.pushed_at}`);
	}

	return {
		name,
		slug: normalizeSlug(owner, name),
		tagline: null,
		description: toNullableString(record.description),
		repoOwner: owner,
		repoName: name,
		repoUrl: `https://github.com/${owner}/${name}`,
		websiteUrl: toNullableString(record.homepage),
		faviconUrl: null,
		screenshotUrl: null,
		language: toNullableString(record.language),
		engine: toNullableString(record.engine),
		license:
			record.license === null || record.license.toUpperCase() === 'NOASSERTION'
				? null
				: record.license,
		topics: normalizeTopics(record.topics),
		stars: record.stars,
		contributors: record.contributors_count,
		forks: record.forks_count,
		watchers: record.watchers_count,
		lastCommitAt: Math.floor(pushedAtMs / 1000),
		healthScore: 0
	};
};

export const buildSeedUpsertSql = (rows: SeedProjectDbRow[]): string => {
	if (rows.length === 0) {
		throw new Error('Seed import aborted: no projects to import');
	}

	const rowValues = rows
		.map((row) => {
			const topicsJson = JSON.stringify(row.topics);

			return `(
				${toSqlString(row.name)},
				${toSqlString(row.slug)},
				${toSqlNullableString(row.tagline)},
				${toSqlNullableString(row.description)},
				${toSqlString(row.repoOwner)},
				${toSqlString(row.repoName)},
				${toSqlString(row.repoUrl)},
				${toSqlNullableString(row.websiteUrl)},
				${toSqlNullableString(row.faviconUrl)},
				${toSqlNullableString(row.screenshotUrl)},
				${toSqlNullableString(row.language)},
				${toSqlNullableString(row.engine)},
				${toSqlNullableString(row.license)},
				${toSqlString(topicsJson)},
				${toSqlNumber(row.stars)},
				${toSqlNumber(row.contributors)},
				${toSqlNumber(row.forks)},
				${toSqlNumber(row.watchers)},
				${toSqlNullableNumber(row.lastCommitAt)},
				${toSqlNumber(row.healthScore)},
				unixepoch()
			)`;
		})
		.join(',\n');

	return `BEGIN TRANSACTION;
INSERT INTO projects (
	name,
	slug,
	tagline,
	description,
	repo_owner,
	repo_name,
	repo_url,
	website_url,
	favicon_url,
	screenshot_url,
	language,
	engine,
	license,
	topics,
	stars,
	contributors,
	forks,
	watchers,
	last_commit_at,
	health_score,
	updated_at
) VALUES
${rowValues}
ON CONFLICT(slug) DO UPDATE SET
	name = excluded.name,
	tagline = excluded.tagline,
	description = excluded.description,
	repo_owner = excluded.repo_owner,
	repo_name = excluded.repo_name,
	repo_url = excluded.repo_url,
	website_url = excluded.website_url,
	language = excluded.language,
	engine = excluded.engine,
	license = excluded.license,
	topics = excluded.topics,
	stars = excluded.stars,
	contributors = excluded.contributors,
	forks = excluded.forks,
	watchers = excluded.watchers,
	last_commit_at = excluded.last_commit_at,
	health_score = excluded.health_score,
	updated_at = unixepoch();
COMMIT;`;
};

export interface SeedImportResult {
	imported: number;
	database: string;
	stdout: string;
	mode: 'local' | 'remote';
}

const runSeedImport = (
	seedPath = DEFAULT_SEED_FILE,
	mode: 'local' | 'remote' = 'local'
): SeedImportResult => {
	const databaseName = process.env.SEED_D1_DATABASE ?? DEFAULT_D1_DATABASE;
	const seedPayload = JSON.parse(readFileSync(seedPath, 'utf8')) as unknown;
	const parsed = parseSeedProjects(seedPayload);
	const mappedRows = parsed.map(mapSeedProjectToProjectRow);
	const sql = buildSeedUpsertSql(mappedRows);
	const tempDir = mkdtempSync(join(tmpdir(), 'clawbotlist-seed-'));
	const sqlPath = join(tempDir, 'seed-upsert.sql');

	writeFileSync(sqlPath, sql, 'utf8');

	try {
		const command = [
			'wrangler',
			'd1',
			'execute',
			databaseName,
			mode === 'remote' ? '--remote' : '--local',
			`--file=${sqlPath}`
		] as const;
		const result = spawnSync('bunx', command, { encoding: 'utf8' });

		if (result.status !== 0) {
			const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
			const missingTableHint =
				mode === 'local' && /no such table:\s*projects/i.test(output)
					? `\nHint: initialize schema first, e.g.\n  bunx wrangler d1 execute ${databaseName} --local --file=drizzle/0000_faulty_chat.sql`
					: '';

			throw new Error(
				`Seed import failed for ${mappedRows.length} project(s): ${output || 'unknown error'}${missingTableHint}`
			);
		}

		return {
			imported: mappedRows.length,
			database: databaseName,
			stdout: result.stdout.trim(),
			mode
		};
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
};

export const runLocalSeedImport = (seedPath = DEFAULT_SEED_FILE): SeedImportResult => {
	return runSeedImport(seedPath, 'local');
};

export const runRemoteSeedImport = (seedPath = DEFAULT_SEED_FILE): SeedImportResult => {
	return runSeedImport(seedPath, 'remote');
};

const parseSeedImportCliArgs = (argv: string[]): { mode: 'local' | 'remote'; seedPath: string } => {
	if (argv[0] === '--remote') {
		return {
			mode: 'remote',
			seedPath: argv[1] ?? DEFAULT_SEED_FILE
		};
	}

	return {
		mode: 'local',
		seedPath: argv[0] ?? DEFAULT_SEED_FILE
	};
};

const isMainModule =
	process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
	try {
		const { mode, seedPath } = parseSeedImportCliArgs(process.argv.slice(2));
		const result = mode === 'remote' ? runRemoteSeedImport(seedPath) : runLocalSeedImport(seedPath);
		console.log(`Imported ${result.imported} seed projects into ${result.mode} D1 (${result.database}).`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`[seed-import] ${message}`);
		process.exit(1);
	}
}
