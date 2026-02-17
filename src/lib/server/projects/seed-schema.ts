export interface SeedProjectRecord {
	repo: string;
	stars: number;
	forks_count: number;
	watchers_count: number;
	contributors_count: number;
	homepage: string;
	language: string;
	description: string;
	pushed_at: string;
	license: string | null;
	category: string;
	engine: string;
	topics: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const expectString = (record: Record<string, unknown>, key: string, path: string): string => {
	const value = record[key];

	if (typeof value !== 'string') {
		throw new Error(`Invalid seed record at ${path}.${key}: expected string, got ${typeof value}`);
	}

	return value;
};

const expectFiniteNumber = (record: Record<string, unknown>, key: string, path: string): number => {
	const value = record[key];

	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`Invalid seed record at ${path}.${key}: expected finite number, got ${String(value)}`);
	}

	if (value < 0) {
		throw new Error(`Invalid seed record at ${path}.${key}: expected non-negative number, got ${value}`);
	}

	return value;
};

const expectTopics = (record: Record<string, unknown>, path: string): string[] => {
	const topics = record.topics;

	if (!Array.isArray(topics)) {
		throw new Error(`Invalid seed record at ${path}.topics: expected string[], got ${typeof topics}`);
	}

	return topics.map((topic, topicIndex) => {
		if (typeof topic !== 'string') {
			throw new Error(
				`Invalid seed record at ${path}.topics[${topicIndex}]: expected string, got ${typeof topic}`
			);
		}

		return topic;
	});
};

const expectLicense = (record: Record<string, unknown>, path: string): string | null => {
	const license = record.license;

	if (license === null) {
		return null;
	}

	if (typeof license !== 'string') {
		throw new Error(`Invalid seed record at ${path}.license: expected string|null, got ${typeof license}`);
	}

	return license;
};

const expectIsoDate = (record: Record<string, unknown>, key: string, path: string): string => {
	const raw = expectString(record, key, path);

	if (Number.isNaN(Date.parse(raw))) {
		throw new Error(`Invalid seed record at ${path}.${key}: expected ISO date string, got ${raw}`);
	}

	return raw;
};

export const parseSeedProjects = (input: unknown): SeedProjectRecord[] => {
	if (!Array.isArray(input)) {
		throw new Error(`Invalid seed payload: expected array, got ${typeof input}`);
	}

	return input.map((item, index) => {
		const path = `[${index}]`;

		if (!isRecord(item)) {
			throw new Error(`Invalid seed record at ${path}: expected object`);
		}

		return {
			repo: expectString(item, 'repo', path),
			stars: expectFiniteNumber(item, 'stars', path),
			forks_count: expectFiniteNumber(item, 'forks_count', path),
			watchers_count: expectFiniteNumber(item, 'watchers_count', path),
			contributors_count: expectFiniteNumber(item, 'contributors_count', path),
			homepage: expectString(item, 'homepage', path),
			language: expectString(item, 'language', path),
			description: expectString(item, 'description', path),
			pushed_at: expectIsoDate(item, 'pushed_at', path),
			license: expectLicense(item, path),
			category: expectString(item, 'category', path),
			engine: expectString(item, 'engine', path),
			topics: expectTopics(item, path)
		};
	});
};
