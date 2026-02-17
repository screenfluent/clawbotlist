<script lang="ts">
	export interface InsightItem {
		label: string;
		value: string;
	}

	let { items }: { items: InsightItem[] } = $props();
</script>

<ul class="insight-row" aria-label="Project insights">
	{#each items as item (item.label)}
		<li class="insight-row__item">
			<span class="insight-row__label">{item.label}</span>
			<strong class="insight-row__value">{item.value}</strong>
		</li>
	{/each}
</ul>
