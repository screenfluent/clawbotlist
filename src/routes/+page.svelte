<script lang="ts">
	import FilterBar from '$lib/components/filter-bar.svelte';
	import ProjectGrid from '$lib/components/project-grid.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>ClawBotList - Personal AI agent directory</title>
	<meta
		name="description"
		content="Discover personal AI agents with live GitHub metrics, health scores, and fast filtering by language, engine, stars, and activity."
	/>
</svelte:head>

<main class="page-shell">
	<header class="page-header">
		<p class="page-header__kicker">clawbotlist.com</p>
		<h1>Personal AI agents, ranked by real GitHub health</h1>
		<p class="page-header__subtitle">
			Open-source claws and autonomous assistants. Filter by language, runtime engine, stars, and recent
			activity.
		</p>
		<p class="page-header__count">Showing {data.projects.length} projects</p>
	</header>

	<FilterBar facets={data.facets} filters={data.filters} />
	<ProjectGrid projects={data.projects} />
</main>
