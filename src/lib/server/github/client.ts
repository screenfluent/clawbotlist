import { repositoryQuery } from './queries';

const DEFAULT_GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

export interface GitHubRepositoryNode {
	name: string;
	nameWithOwner: string;
	description: string | null;
	url: string;
	homepageUrl: string | null;
	createdAt: string;
	pushedAt: string | null;
	stargazerCount: number;
	forkCount: number;
	watchers: {
		totalCount: number;
	};
	mentionableUsers: {
		totalCount: number;
	};
	licenseInfo: {
		spdxId: string;
	} | null;
	repositoryTopics: {
		nodes: Array<{
			topic: {
				name: string;
			};
		}>;
	};
}

interface GitHubGraphQlResponse {
	data?: {
		repository: GitHubRepositoryNode | null;
	};
	errors?: Array<{
		message?: string;
	}>;
}

export interface GitHubClient {
	queryRepository(owner: string, name: string): Promise<GitHubRepositoryNode | null>;
}

export interface GitHubClientOptions {
	token?: string;
	fetchImpl?: typeof fetch;
	endpoint?: string;
}

const getToken = (overrideToken?: string): string => {
	const token = (overrideToken ?? process.env.GITHUB_TOKEN ?? '').trim();

	if (token.length === 0) {
		throw new Error('Missing GitHub token. Set GITHUB_TOKEN before refreshing project metrics.');
	}

	return token;
};

const toErrorMessage = (response: GitHubGraphQlResponse): string => {
	const firstError = response.errors?.find((entry) => typeof entry.message === 'string');
	return firstError?.message?.trim() || 'Unknown GitHub GraphQL error';
};

export const createGitHubClient = (options: GitHubClientOptions = {}): GitHubClient => {
	const token = getToken(options.token);
	const fetchImpl = options.fetchImpl ?? fetch;
	const endpoint = options.endpoint ?? DEFAULT_GITHUB_GRAPHQL_URL;

	return {
		async queryRepository(owner: string, name: string): Promise<GitHubRepositoryNode | null> {
			const response = await fetchImpl(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					query: repositoryQuery,
					variables: { owner, name }
				})
			});

			if (!response.ok) {
				const responseBody = await response.text();
				const details = responseBody.trim();

				if (response.status === 401 || response.status === 403) {
					throw new Error(
						`GitHub token rejected (${response.status}). Check GITHUB_TOKEN value and scopes. ${details}`.trim()
					);
				}

				throw new Error(
					`GitHub GraphQL request failed (${response.status}). ${details || 'No response body.'}`
				);
			}

			const payload = (await response.json()) as GitHubGraphQlResponse;

			if (payload.errors && payload.errors.length > 0) {
				throw new Error(`GitHub GraphQL error: ${toErrorMessage(payload)}`);
			}

			return payload.data?.repository ?? null;
		}
	};
};
