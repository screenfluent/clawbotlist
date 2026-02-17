<script lang="ts">
	import type { ProjectCard } from '$lib/types/project';
	import InsightRow from './insight-row.svelte';

	let { project }: { project: ProjectCard } = $props();

	const compactNumber = new Intl.NumberFormat('en', {
		notation: 'compact',
		maximumFractionDigits: 1
	});

	const formatLastCommit = (value: Date | string | null): string => {
		if (!value) {
			return 'Unknown';
		}

		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) {
			return 'Unknown';
		}

		const diffDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)));

		if (diffDays === 0) {
			return 'Today';
		}

		if (diffDays === 1) {
			return '1 day ago';
		}

		if (diffDays < 30) {
			return `${diffDays} days ago`;
		}

		const diffMonths = Math.floor(diffDays / 30);
		if (diffMonths === 1) {
			return '1 month ago';
		}

		if (diffMonths < 12) {
			return `${diffMonths} months ago`;
		}

		const diffYears = Math.floor(diffMonths / 12);
		return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
	};

	let summaryText = $derived(project.tagline ?? project.description ?? 'No tagline available yet.');
	let detailText = $derived(project.description ?? project.tagline ?? 'No description available yet.');

	let insightItems = $derived([
		{ label: 'Stars', value: compactNumber.format(project.stars) },
		{ label: 'Contributors', value: compactNumber.format(project.contributors) },
		{ label: 'Last commit', value: formatLastCommit(project.lastCommitAt) }
	]);

	let primaryUrl = $derived(project.websiteUrl ?? project.repoUrl);
	let topicPreview = $derived(project.topics.slice(0, 4));
</script>

<article class="project-card">
	<a class="project-card__link" href={primaryUrl} target="_blank" rel="noreferrer">
		<header class="project-card__header">
			{#if project.faviconUrl}
				<img class="project-card__favicon" src={project.faviconUrl} alt="{project.name} favicon" loading="lazy" />
			{:else}
				<div class="project-card__favicon-fallback" aria-hidden="true">
					{project.name.charAt(0).toUpperCase()}
				</div>
			{/if}

			<div class="project-card__title-wrap">
				<h2 class="project-card__title">{project.name}</h2>
				<p class="project-card__tagline">{summaryText}</p>
			</div>
		</header>

		<InsightRow items={insightItems} />

		<div class="project-card__meta">
			<span class="project-chip">{project.language ?? 'Unknown language'}</span>
			<span class="project-chip">{project.engine ?? 'Unknown engine'}</span>
			<span class="project-chip">{project.license ?? 'No license'}</span>
		</div>

		<div class="project-card__hover" aria-label="Expanded project details">
			<p class="project-card__description">{detailText}</p>
			{#if topicPreview.length > 0}
				<p class="project-card__topics">{topicPreview.join(' · ')}</p>
			{/if}
		</div>
	</a>
</article>
