export interface ProjectCard {
	name: string;
	slug: string;
	description: string | null;
	tagline: string | null;
	stars: number;
	contributors: number;
	lastCommitAt: Date | null;
	forks: number;
	watchers: number;
	language: string | null;
	engine: string | null;
	license: string | null;
	topics: string[];
	healthScore: number;
	websiteUrl: string | null;
	repoUrl: string;
	faviconUrl: string | null;
	screenshotUrl: string | null;
}

export interface ProjectEntity extends ProjectCard {
	id: number;
	repoOwner: string;
	repoName: string;
	createdAt: Date;
	updatedAt: Date;
}
