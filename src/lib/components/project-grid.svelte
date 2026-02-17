<script lang="ts">
	import type { ProjectCard } from '$lib/types/project';
	import ProjectCardComponent from './project-card.svelte';

	let { projects }: { projects: ProjectCard[] } = $props();
</script>

<section class="project-grid" aria-live="polite">
	{#if projects.length === 0}
		<p class="project-grid__empty">No projects match your current filters.</p>
	{:else}
		<ul class="project-grid__list">
			{#each projects as project (project.slug)}
				<li>
					<ProjectCardComponent {project} />
				</li>
			{/each}
		</ul>
	{/if}
</section>
