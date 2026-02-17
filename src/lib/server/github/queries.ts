export const repositoryQuery = `
query Repository($owner: String!, $name: String!) {
	repository(owner: $owner, name: $name) {
		name
		nameWithOwner
		description
		url
		homepageUrl
		createdAt
		pushedAt
		stargazerCount
		forkCount
		watchers {
			totalCount
		}
		mentionableUsers {
			totalCount
		}
		licenseInfo {
			spdxId
		}
		repositoryTopics(first: 10) {
			nodes {
				topic {
					name
				}
			}
		}
	}
}
`;
