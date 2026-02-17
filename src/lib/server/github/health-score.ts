const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface HealthScoreInput {
	stars: number;
	forks: number;
	contributors: number;
	watchers: number;
	createdAt: Date;
	pushedAt: Date | null;
}

const differenceInDays = (now: Date, then: Date): number => {
	return Math.max(0, Math.floor((now.getTime() - then.getTime()) / ONE_DAY_MS));
};

const differenceInYears = (now: Date, then: Date): number => {
	let years = now.getUTCFullYear() - then.getUTCFullYear();
	const hasNotReachedYearMark =
		now.getUTCMonth() < then.getUTCMonth() ||
		(now.getUTCMonth() === then.getUTCMonth() && now.getUTCDate() < then.getUTCDate());

	if (hasNotReachedYearMark) {
		years -= 1;
	}

	return Math.max(0, years);
};

/**
 * OpenAlternative-inspired score:
 * - engagement metrics (stars/forks/watchers/contributors) weighted with an age factor
 * - commit recency penalty to demote abandoned repositories
 */
export const calculateHealthScore = (input: HealthScoreInput, now = new Date()): number => {
	const { stars, forks, contributors, watchers, createdAt, pushedAt } = input;
	const daysSinceLastCommit = pushedAt ? differenceInDays(now, pushedAt) : 90;
	const lastCommitPenalty = Math.min(daysSinceLastCommit, 90) * 0.5;

	const ageInYears = differenceInYears(now, createdAt);
	const ageFactor = 0.5 + 0.5 / (1 + ageInYears / 5);

	const starsScore = stars * 0.25 * ageFactor;
	const forksScore = forks * 0.25 * ageFactor;
	const watchersScore = watchers * 0.25 * ageFactor;
	const contributorsScore = contributors * 0.5 * ageFactor;

	return Math.max(
		0,
		Math.round(starsScore + forksScore + contributorsScore + watchersScore - lastCommitPenalty)
	);
};
