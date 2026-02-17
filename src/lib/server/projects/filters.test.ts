import { describe, expect, it } from 'vitest';
import { parseProjectFilters } from './filters';

describe('project filters parser', () => {
	it('parses valid query params into normalized filter state', () => {
		const filters = parseProjectFilters(
			new URLSearchParams({
				language: 'TypeScript',
				engine: 'multi-llm',
				starsMin: '100',
				starsMax: '2000',
				activity: 'recent'
			})
		);

		expect(filters).toEqual({
			language: 'TypeScript',
			engine: 'multi-llm',
			starsMin: 100,
			starsMax: 2000,
			activity: 'recent'
		});
	});

	it('applies safe defaults for missing/invalid values', () => {
		const filters = parseProjectFilters(
			new URLSearchParams({
				language: '   ',
				engine: '',
				starsMin: '-5',
				starsMax: 'NaN',
				activity: 'totally-unknown'
			})
		);

		expect(filters).toEqual({
			language: null,
			engine: null,
			starsMin: null,
			starsMax: null,
			activity: 'all'
		});
	});

	it('resets stars range when min is greater than max', () => {
		const filters = parseProjectFilters(
			new URLSearchParams({
				starsMin: '1000',
				starsMax: '100'
			})
		);

		expect(filters.starsMin).toBeNull();
		expect(filters.starsMax).toBeNull();
	});
});
