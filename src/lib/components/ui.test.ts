import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import type { ProjectCard } from '$lib/types/project';
import ProjectCardComponent from './project-card.svelte';
import ProjectGrid from './project-grid.svelte';
import FilterBar from './filter-bar.svelte';

const sampleProject: ProjectCard = {
	name: 'OpenClaw',
	slug: 'openclaw-openclaw',
	description: 'Personal AI assistant with local-first workflows and autonomous loops.',
	tagline: 'Your own personal AI assistant.',
	stars: 204554,
	contributors: 720,
	lastCommitAt: new Date('2026-02-17T18:22:55Z'),
	forks: 37133,
	watchers: 1110,
	language: 'TypeScript',
	engine: 'multi-llm',
	license: 'MIT',
	topics: ['ai', 'assistant'],
	healthScore: 999,
	websiteUrl: 'https://openclaw.ai',
	repoUrl: 'https://github.com/openclaw/openclaw',
	faviconUrl: 'https://openclaw.ai/favicon.ico',
	screenshotUrl: null
};

describe('homepage UI components', () => {
	it('renders core project card information', () => {
		const { body } = render(ProjectCardComponent, {
			props: {
				project: sampleProject
			}
		});

		expect(body).toContain('OpenClaw');
		expect(body).toContain('Your own personal AI assistant.');
		expect(body).toContain('TypeScript');
		expect(body).toContain('multi-llm');
		expect(body).toContain('MIT');
		expect(body).toContain('Stars');
		expect(body).toContain('Contributors');
		expect(body).toContain('Last commit');
	});

	it('renders a GET filter form with expected query keys', () => {
		const { body } = render(FilterBar, {
			props: {
				facets: {
					languages: ['Python', 'TypeScript'],
					engines: ['anthropic-sdk', 'multi-llm'],
					stars: { min: 10, max: 5000 },
					activities: ['all', 'active', 'recent', 'stale']
				},
				filters: {
					language: 'TypeScript',
					engine: null,
					starsMin: 100,
					starsMax: null,
					activity: 'active'
				}
			}
		});

		expect(body).toContain('method="GET"');
		expect(body).toContain('name="language"');
		expect(body).toContain('name="engine"');
		expect(body).toContain('name="starsMin"');
		expect(body).toContain('name="starsMax"');
		expect(body).toContain('name="activity"');
		expect(body).toContain('Reset');
	});

	it('shows empty state when no projects exist', () => {
		const { body } = render(ProjectGrid, {
			props: {
				projects: []
			}
		});

		expect(body).toContain('No projects match your current filters');
	});
});
