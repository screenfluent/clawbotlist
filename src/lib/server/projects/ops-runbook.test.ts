import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('ops quality gates + deploy runbook', () => {
	it('exposes required quality/deploy scripts', () => {
		const packagePath = join(process.cwd(), 'package.json');
		const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as {
			scripts?: Record<string, string>;
		};
		const scripts = pkg.scripts ?? {};

		expect(scripts.check).toBeTypeOf('string');
		expect(scripts.test).toBeTypeOf('string');
		expect(scripts.lint).toBeTypeOf('string');
		expect(scripts.typecheck).toBeTypeOf('string');
		expect(scripts.build).toBeTypeOf('string');
		expect(scripts['deploy:dry-run']).toBeTypeOf('string');
		expect(scripts['db:migrate:local']).toBeTypeOf('string');
		expect(scripts['db:migrate:remote']).toBeTypeOf('string');
		expect(scripts['db:seed:local']).toBeTypeOf('string');
		expect(scripts['db:refresh:metrics:local']).toBeTypeOf('string');
	});

	it('keeps bun test on a dedicated smoke path', () => {
		const bunfigPath = join(process.cwd(), 'bunfig.toml');
		expect(existsSync(bunfigPath)).toBe(true);

		const bunfig = readFileSync(bunfigPath, 'utf8');
		expect(bunfig).toContain('[test]');
		expect(bunfig).toContain('root = ".bun-tests"');

		const smokeTestPath = join(process.cwd(), '.bun-tests', 'smoke.test.ts');
		expect(existsSync(smokeTestPath)).toBe(true);
	});

	it('documents local/dev/prod workflow, env vars, and troubleshooting', () => {
		const runbookPath = join(process.cwd(), 'docs/deploy.md');
		expect(existsSync(runbookPath)).toBe(true);

		const content = readFileSync(runbookPath, 'utf8');

		for (const command of [
			'bun run db:migrate:local',
			'bun run db:seed:local',
			'bun run db:refresh:metrics:local',
			'bun run check',
			'bun run test',
			'bun run build',
			'bun run deploy:dry-run',
			'bun run db:migrate:remote'
		]) {
			expect(content).toContain(command);
		}

		for (const envVar of ['GITHUB_TOKEN', 'SEED_D1_DATABASE', 'CLOUDFLARE_API_TOKEN']) {
			expect(content).toContain(envVar);
		}

		expect(content).toMatch(/missing token/i);
		expect(content).toMatch(/DB binding mismatch/i);
		expect(content).toMatch(/empty dataset/i);
	});
});
