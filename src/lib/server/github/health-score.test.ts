import { describe, expect, it } from 'vitest';
import { calculateHealthScore } from './health-score';

describe('calculateHealthScore', () => {
	it('scores recently active repositories higher than stale ones', () => {
		const now = new Date('2026-02-17T00:00:00.000Z');
		const base = {
			stars: 250,
			forks: 50,
			contributors: 20,
			watchers: 40,
			createdAt: new Date('2025-02-01T00:00:00.000Z')
		};

		const freshScore = calculateHealthScore({ ...base, pushedAt: new Date('2026-02-16T00:00:00.000Z') }, now);
		const staleScore = calculateHealthScore({ ...base, pushedAt: new Date('2025-01-01T00:00:00.000Z') }, now);

		expect(freshScore).toBeGreaterThan(staleScore);
	});

	it('applies an age factor penalty for old repositories', () => {
		const now = new Date('2026-02-17T00:00:00.000Z');
		const recentRepo = calculateHealthScore(
			{
				stars: 1000,
				forks: 200,
				contributors: 40,
				watchers: 120,
				createdAt: new Date('2025-12-01T00:00:00.000Z'),
				pushedAt: new Date('2026-02-16T00:00:00.000Z')
			},
			now
		);

		const oldRepo = calculateHealthScore(
			{
				stars: 1000,
				forks: 200,
				contributors: 40,
				watchers: 120,
				createdAt: new Date('2012-01-01T00:00:00.000Z'),
				pushedAt: new Date('2026-02-16T00:00:00.000Z')
			},
			now
		);

		expect(recentRepo).toBeGreaterThan(oldRepo);
	});

	it('returns an integer score for deterministic sorting', () => {
		const score = calculateHealthScore({
			stars: 10,
			forks: 5,
			contributors: 2,
			watchers: 1,
			createdAt: new Date('2025-01-01T00:00:00.000Z'),
			pushedAt: new Date('2026-02-16T00:00:00.000Z')
		});

		expect(Number.isInteger(score)).toBe(true);
	});
});
