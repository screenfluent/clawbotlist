import { describe, expect, it } from 'vitest';
import { mapRepositoryToProjectMetrics } from './mapper';
import type { GitHubRepositoryNode } from './client';

const createRepository = (overrides: Partial<GitHubRepositoryNode> = {}): GitHubRepositoryNode => ({
	name: 'clawbot',
	nameWithOwner: 'acme/clawbot',
	description: '  Helpful autonomous agent  ',
	url: 'https://github.com/acme/clawbot',
	homepageUrl: '  https://clawbot.dev  ',
	createdAt: '2025-01-01T00:00:00.000Z',
	pushedAt: '2026-02-16T00:00:00.000Z',
	stargazerCount: 500,
	forkCount: 80,
	watchers: { totalCount: 30 },
	mentionableUsers: { totalCount: 12 },
	licenseInfo: { spdxId: 'MIT' },
	repositoryTopics: {
		nodes: [{ topic: { name: ' AI ' } }, { topic: { name: 'agents' } }, { topic: { name: 'ai' } }]
	},
	...overrides
});

describe('mapRepositoryToProjectMetrics', () => {
	it('normalizes nullable strings, topics, and NOASSERTION license values', () => {
		const metrics = mapRepositoryToProjectMetrics(
			createRepository({
				description: '   ',
				homepageUrl: '   ',
				licenseInfo: { spdxId: '  noassertion  ' }
			}),
			new Date('2026-02-17T00:00:00.000Z')
		);

		expect(metrics.description).toBeNull();
		expect(metrics.websiteUrl).toBeNull();
		expect(metrics.license).toBeNull();
		expect(metrics.topics).toEqual(['ai', 'agents']);
		expect(metrics.healthScore).toBeGreaterThan(0);
	});

	it('throws when createdAt is invalid', () => {
		expect(() =>
			mapRepositoryToProjectMetrics(
				createRepository({
					createdAt: 'not-a-date'
				})
			)
		).toThrowError(/Invalid GitHub date value/);
	});
});
