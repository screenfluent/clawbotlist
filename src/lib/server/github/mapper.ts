import { calculateHealthScore } from './health-score';
import type { GitHubRepositoryNode } from './client';

export interface ProjectMetricsPayload {
	description: string | null;
	websiteUrl: string | null;
	license: string | null;
	topics: string[];
	stars: number;
	forks: number;
	watchers: number;
	contributors: number;
	lastCommitAt: Date | null;
	healthScore: number;
}

const toNullableString = (value: string | null): string | null => {
	if (value === null) {
		return null;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
};

const normalizeTopics = (topics: GitHubRepositoryNode['repositoryTopics']['nodes']): string[] => {
	const normalized = topics
		.map((node) => node.topic.name.trim().toLowerCase())
		.filter((value) => value.length > 0);

	return Array.from(new Set(normalized));
};

const toDateOrNull = (value: string | null): Date | null => {
	if (value === null) {
		return null;
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid GitHub date value: ${value}`);
	}

	return date;
};

const normalizeLicense = (licenseInfo: GitHubRepositoryNode['licenseInfo']): string | null => {
	if (licenseInfo === null) {
		return null;
	}

	const normalized = licenseInfo.spdxId.trim();
	if (normalized.length === 0) {
		return null;
	}

	return normalized.toUpperCase() === 'NOASSERTION' ? null : normalized;
};

export const mapRepositoryToProjectMetrics = (
	repository: GitHubRepositoryNode,
	now = new Date()
): ProjectMetricsPayload => {
	const createdAt = toDateOrNull(repository.createdAt);
	if (!createdAt) {
		throw new Error(`Repository ${repository.nameWithOwner} is missing createdAt`);
	}

	const pushedAt = toDateOrNull(repository.pushedAt);
	const license = normalizeLicense(repository.licenseInfo);

	return {
		description: toNullableString(repository.description),
		websiteUrl: toNullableString(repository.homepageUrl),
		license,
		topics: normalizeTopics(repository.repositoryTopics.nodes),
		stars: repository.stargazerCount,
		forks: repository.forkCount,
		watchers: repository.watchers.totalCount,
		contributors: repository.mentionableUsers.totalCount,
		lastCommitAt: pushedAt,
		healthScore: calculateHealthScore(
			{
				stars: repository.stargazerCount,
				forks: repository.forkCount,
				contributors: repository.mentionableUsers.totalCount,
				watchers: repository.watchers.totalCount,
				createdAt,
				pushedAt
			},
			now
		)
	};
};
