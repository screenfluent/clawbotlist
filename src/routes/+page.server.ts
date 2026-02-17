import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db/client';
import { parseProjectFilters } from '$lib/server/projects/filters';
import { getHomepageData } from '$lib/server/projects/service';

export const load: PageServerLoad = async (event) => {
	const db = getDb(event);
	const filters = parseProjectFilters(event.url.searchParams);

	return getHomepageData(db, filters);
};
