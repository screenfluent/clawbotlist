import { error, type RequestEvent } from '@sveltejs/kit';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

type DbRequestEvent = Pick<RequestEvent, 'platform'>;

export const getDb = (event: DbRequestEvent) => {
	const dbBinding = event.platform?.env?.DB;

	if (!dbBinding) {
		throw error(500, 'D1 database binding `DB` is not configured on platform.env');
	}

	return drizzle(dbBinding, { schema });
};

export type DbClient = ReturnType<typeof getDb>;
