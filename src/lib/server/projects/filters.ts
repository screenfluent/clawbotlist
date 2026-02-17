export const activityFilterValues = ['all', 'active', 'recent', 'stale'] as const;

export type ActivityFilter = (typeof activityFilterValues)[number];

export interface ProjectFilters {
	language: string | null;
	engine: string | null;
	starsMin: number | null;
	starsMax: number | null;
	activity: ActivityFilter;
}

const parseOptionalText = (value: string | null): string | null => {
	if (value === null) {
		return null;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
};

const parseNonNegativeInteger = (value: string | null): number | null => {
	if (value === null) {
		return null;
	}

	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return null;
	}

	return parsed;
};

const parseActivity = (value: string | null): ActivityFilter => {
	if (value === null) {
		return 'all';
	}

	return activityFilterValues.includes(value as ActivityFilter) ? (value as ActivityFilter) : 'all';
};

export const parseProjectFilters = (searchParams: URLSearchParams): ProjectFilters => {
	const language = parseOptionalText(searchParams.get('language'));
	const engine = parseOptionalText(searchParams.get('engine'));
	let starsMin = parseNonNegativeInteger(searchParams.get('starsMin'));
	let starsMax = parseNonNegativeInteger(searchParams.get('starsMax'));
	const activity = parseActivity(searchParams.get('activity'));

	if (starsMin !== null && starsMax !== null && starsMin > starsMax) {
		starsMin = null;
		starsMax = null;
	}

	return {
		language,
		engine,
		starsMin,
		starsMax,
		activity
	};
};
