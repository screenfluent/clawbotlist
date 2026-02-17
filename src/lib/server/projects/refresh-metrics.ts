import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createGitHubClient, type GitHubClient } from '../github/client';
import { mapRepositoryToProjectMetrics, type ProjectMetricsPayload } from '../github/mapper';

const DEFAULT_D1_DATABASE = 'clawbotlist-db';

export interface RefreshTarget {
	id: number;
	slug: string;
	repoOwner: string;
	repoName: string;
}

export interface MetricsUpdate extends ProjectMetricsPayload {
	id: number;
}

export interface MetricsStore {
	listTargets(options?: { slug?: string }): Promise<RefreshTarget[]>;
	applyUpdates(updates: MetricsUpdate[]): Promise<void>;
}

export interface MetricsRefreshSummary {
	processed: number;
	updated: number;
	failed: number;
	errors: string[];
}

export interface RefreshOptions {
	mode?: 'all' | 'one';
	slug?: string;
}

const toSqlString = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const toSqlNullableString = (value: string | null): string => {
	return value === null ? 'NULL' : toSqlString(value);
};

const toSqlNumber = (value: number): string => {
	if (!Number.isFinite(value)) {
		throw new Error(`Invalid numeric SQL value: ${String(value)}`);
	}

	return `${Math.trunc(value)}`;
};

const toSqlNullableTimestamp = (value: Date | null): string => {
	if (value === null) {
		return 'NULL';
	}

	return toSqlNumber(Math.floor(value.getTime() / 1000));
};

export const buildMetricsUpdateSql = (updates: MetricsUpdate[]): string => {
	if (updates.length === 0) {
		return 'BEGIN TRANSACTION;\nCOMMIT;';
	}

	const statements = updates
		.map((update) => {
			return `UPDATE projects SET
	description = ${toSqlNullableString(update.description)},
	website_url = ${toSqlNullableString(update.websiteUrl)},
	license = ${toSqlNullableString(update.license)},
	topics = ${toSqlString(JSON.stringify(update.topics))},
	stars = ${toSqlNumber(update.stars)},
	forks = ${toSqlNumber(update.forks)},
	watchers = ${toSqlNumber(update.watchers)},
	contributors = ${toSqlNumber(update.contributors)},
	last_commit_at = ${toSqlNullableTimestamp(update.lastCommitAt)},
	health_score = ${toSqlNumber(update.healthScore)},
	updated_at = unixepoch()
WHERE id = ${toSqlNumber(update.id)};`;
		})
		.join('\n');

	return `BEGIN TRANSACTION;\n${statements}\nCOMMIT;`;
};

export const refreshProjectMetrics = async (
	store: MetricsStore,
	githubClient: GitHubClient,
	options: RefreshOptions = {}
): Promise<MetricsRefreshSummary> => {
	const mode = options.mode ?? 'all';

	if (mode === 'one' && !options.slug) {
		throw new Error('Single-project refresh requires a slug (pass mode=one with slug).');
	}

	const targets = await store.listTargets({ slug: mode === 'one' ? options.slug : undefined });
	const updates: MetricsUpdate[] = [];
	const errors: string[] = [];

	for (const target of targets) {
		const repositoryPath = `${target.repoOwner}/${target.repoName}`;

		try {
			const repository = await githubClient.queryRepository(target.repoOwner, target.repoName);

			if (!repository) {
				errors.push(`Failed ${repositoryPath}: repository not found via GitHub GraphQL`);
				continue;
			}

			updates.push({
				id: target.id,
				...mapRepositoryToProjectMetrics(repository)
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			errors.push(`Failed ${repositoryPath}: ${message}`);
		}
	}

	if (updates.length > 0) {
		await store.applyUpdates(updates);
	}

	return {
		processed: targets.length,
		updated: updates.length,
		failed: errors.length,
		errors
	};
};

interface WranglerSelectResult {
	success: boolean;
	results?: unknown[];
	error?: string;
}

const executeLocalD1Json = (databaseName: string, command: string): WranglerSelectResult => {
	const result = spawnSync(
		'bunx',
		['wrangler', 'd1', 'execute', databaseName, '--local', '--json', '--command', command],
		{ encoding: 'utf8' }
	);

	if (result.status !== 0) {
		const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
		throw new Error(`wrangler d1 execute failed: ${output || 'unknown error'}`);
	}

	const raw = result.stdout.trim();
	const parsed = JSON.parse(raw) as WranglerSelectResult[];
	const first = parsed[0];

	if (!first) {
		throw new Error('Unexpected empty JSON response from wrangler d1 execute');
	}

	if (!first.success) {
		throw new Error(`D1 query failed: ${first.error ?? 'unknown error'}`);
	}

	return first;
};

const executeLocalD1File = (databaseName: string, sql: string): void => {
	const tempDir = mkdtempSync(join(tmpdir(), 'clawbotlist-refresh-'));
	const sqlPath = join(tempDir, 'refresh-metrics.sql');
	writeFileSync(sqlPath, sql, 'utf8');

	try {
		const result = spawnSync(
			'bunx',
			['wrangler', 'd1', 'execute', databaseName, '--local', `--file=${sqlPath}`],
			{ encoding: 'utf8' }
		);

		if (result.status !== 0) {
			const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
			throw new Error(`wrangler d1 execute failed: ${output || 'unknown error'}`);
		}
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
};

const parseTarget = (value: unknown): RefreshTarget => {
	if (typeof value !== 'object' || value === null) {
		throw new Error('Invalid D1 row while refreshing metrics: expected object');
	}

	const row = value as Record<string, unknown>;

	if (
		typeof row.id !== 'number' ||
		typeof row.slug !== 'string' ||
		typeof row.repo_owner !== 'string' ||
		typeof row.repo_name !== 'string'
	) {
		throw new Error('Invalid D1 row shape while refreshing metrics');
	}

	return {
		id: row.id,
		slug: row.slug,
		repoOwner: row.repo_owner,
		repoName: row.repo_name
	};
};

export const createLocalD1MetricsStore = (databaseName = process.env.SEED_D1_DATABASE ?? DEFAULT_D1_DATABASE): MetricsStore => {
	return {
		async listTargets(options) {
			const whereClause = options?.slug ? ` WHERE slug = ${toSqlString(options.slug)}` : '';
			const response = executeLocalD1Json(
				databaseName,
				`SELECT id, slug, repo_owner, repo_name FROM projects${whereClause} ORDER BY id;`
			);

			return (response.results ?? []).map(parseTarget);
		},
		async applyUpdates(updates) {
			executeLocalD1File(databaseName, buildMetricsUpdateSql(updates));
		}
	};
};

const parseCliOptions = (argv: string[]): RefreshOptions => {
	if (argv.length === 0) {
		return { mode: 'all' };
	}

	if (argv[0] === '--slug') {
		const slug = argv[1]?.trim();
		if (!slug) {
			throw new Error('Missing value after --slug');
		}

		return { mode: 'one', slug };
	}

	throw new Error(`Unknown refresh-metrics argument: ${argv[0]}`);
};

export const runLocalMetricsRefresh = async (argv = process.argv.slice(2)): Promise<MetricsRefreshSummary> => {
	const options = parseCliOptions(argv);
	const githubClient = createGitHubClient();
	const store = createLocalD1MetricsStore();
	return refreshProjectMetrics(store, githubClient, options);
};

const isMainModule =
	process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
	runLocalMetricsRefresh()
		.then((summary) => {
			console.log(
				`Metrics refresh complete: processed=${summary.processed}, updated=${summary.updated}, failed=${summary.failed}`
			);

			if (summary.errors.length > 0) {
				for (const error of summary.errors) {
					console.warn(`[refresh-metrics] ${error}`);
				}
			}
		})
		.catch((error) => {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`[refresh-metrics] ${message}`);
			process.exit(1);
		});
}
