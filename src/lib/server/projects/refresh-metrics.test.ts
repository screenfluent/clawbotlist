import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createGitHubClient, type GitHubRepositoryNode } from '../github/client';
import {
	buildMetricsUpdateSql,
	refreshProjectMetrics,
	type MetricsStore,
	type RefreshTarget
} from './refresh-metrics';

const migrationPath = join(process.cwd(), 'drizzle/0000_faulty_chat.sql');

const makeDb = () => {
	const db = new Database(':memory:');
	db.exec(readFileSync(migrationPath, 'utf8'));
	return db;
};

const insertProject = (db: Database.Database, row: { slug: string; owner: string; name: string }) => {
	db.prepare(
		`INSERT INTO projects (
			name, slug, repo_owner, repo_name, repo_url, topics, stars, contributors, forks, watchers, health_score, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, '[]', 0, 0, 0, 0, 0, unixepoch(), unixepoch())`
	).run(row.name, row.slug, row.owner, row.name, `https://github.com/${row.owner}/${row.name}`);
};

const makeStore = (db: Database.Database): MetricsStore => ({
	async listTargets() {
		return db
			.prepare('SELECT id, slug, repo_owner, repo_name FROM projects ORDER BY id')
			.all()
			.map((row) => {
				const project = row as {
					id: number;
					slug: string;
					repo_owner: string;
					repo_name: string;
				};

				return {
					id: project.id,
					slug: project.slug,
					repoOwner: project.repo_owner,
					repoName: project.repo_name
				} satisfies RefreshTarget;
			});
	},
	async applyUpdates(updates) {
		if (updates.length === 0) {
			return;
		}

		db.exec(buildMetricsUpdateSql(updates));
	}
});

const createRepositoryNode = (nameWithOwner: string): GitHubRepositoryNode => ({
	name: nameWithOwner.split('/')[1],
	nameWithOwner,
	description: 'Updated from GitHub',
	url: `https://github.com/${nameWithOwner}`,
	homepageUrl: 'https://example.dev',
	createdAt: '2025-01-01T00:00:00.000Z',
	pushedAt: '2026-02-16T00:00:00.000Z',
	stargazerCount: 1234,
	forkCount: 321,
	watchers: { totalCount: 40 },
	mentionableUsers: { totalCount: 16 },
	licenseInfo: { spdxId: 'MIT' },
	repositoryTopics: {
		nodes: [{ topic: { name: 'AI' } }, { topic: { name: 'agents' } }]
	}
});

describe('refresh project metrics', () => {
	it('updates DB metrics + health score from GitHub data', async () => {
		const db = makeDb();
		insertProject(db, {
			slug: 'acme-demo',
			owner: 'acme',
			name: 'demo'
		});

		const summary = await refreshProjectMetrics(
			makeStore(db),
			{
				async queryRepository(owner, repo) {
					return createRepositoryNode(`${owner}/${repo}`);
				}
			},
			{ mode: 'all' }
		);

		expect(summary.processed).toBe(1);
		expect(summary.updated).toBe(1);
		expect(summary.failed).toBe(0);

		const row = db
			.prepare(
				'SELECT stars, forks, watchers, contributors, health_score, last_commit_at, license, topics FROM projects WHERE slug = ?'
			)
			.get('acme-demo') as {
				stars: number;
				forks: number;
				watchers: number;
				contributors: number;
				health_score: number;
				last_commit_at: number | null;
				license: string | null;
				topics: string;
			};

		expect(row.stars).toBe(1234);
		expect(row.forks).toBe(321);
		expect(row.watchers).toBe(40);
		expect(row.contributors).toBe(16);
		expect(row.health_score).toBeGreaterThan(0);
		expect(row.last_commit_at).not.toBeNull();
		expect(row.license).toBe('MIT');
		expect(JSON.parse(row.topics)).toEqual(['ai', 'agents']);
	});

	it('continues batch refresh on per-repo failures (partial success)', async () => {
		const db = makeDb();
		insertProject(db, { slug: 'ok-repo', owner: 'acme', name: 'ok' });
		insertProject(db, { slug: 'bad-repo', owner: 'acme', name: 'bad' });

		const summary = await refreshProjectMetrics(
			makeStore(db),
			{
				async queryRepository(owner, repo) {
					if (repo === 'bad') {
						throw new Error('GitHub API timeout');
					}

					return createRepositoryNode(`${owner}/${repo}`);
				}
			},
			{ mode: 'all' }
		);

		expect(summary.processed).toBe(2);
		expect(summary.updated).toBe(1);
		expect(summary.failed).toBe(1);
		expect(summary.errors[0]).toContain('acme/bad');
		expect(summary.errors[0]).toContain('GitHub API timeout');

		const ok = db.prepare('SELECT health_score FROM projects WHERE slug = ?').get('ok-repo') as {
			health_score: number;
		};
		const bad = db.prepare('SELECT health_score FROM projects WHERE slug = ?').get('bad-repo') as {
			health_score: number;
		};

		expect(ok.health_score).toBeGreaterThan(0);
		expect(bad.health_score).toBe(0);
	});

	it('throws a clear error when GITHUB_TOKEN is missing', () => {
		expect(() => createGitHubClient({ token: '' })).toThrowError(/GITHUB_TOKEN/i);
	});

	it('throws a clear error when GitHub token is invalid', async () => {
		const client = createGitHubClient({
			token: 'invalid-token',
			fetchImpl: async () =>
				({
					ok: false,
					status: 401,
					text: async () => 'Bad credentials'
				}) as unknown as Response
		});

		await expect(client.queryRepository('acme', 'repo')).rejects.toThrowError(/GITHUB_TOKEN/i);
	});
});
