<script lang="ts">
	type ActivityFilter = 'all' | 'active' | 'recent' | 'stale';

	interface FilterFacets {
		languages: string[];
		engines: string[];
		stars: {
			min: number;
			max: number;
		};
		activities: ActivityFilter[];
	}

	interface ActiveFilters {
		language: string | null;
		engine: string | null;
		starsMin: number | null;
		starsMax: number | null;
		activity: ActivityFilter;
	}

	let { facets, filters }: { facets: FilterFacets; filters: ActiveFilters } = $props();

	const activityLabels: Record<ActivityFilter, string> = {
		all: 'All activity',
		active: 'Active (<= 30d)',
		recent: 'Recent (31-90d)',
		stale: 'Stale (> 90d)'
	};

	let hasActiveFilters = $derived(
		filters.language !== null ||
			filters.engine !== null ||
			filters.starsMin !== null ||
			filters.starsMax !== null ||
			filters.activity !== 'all'
	);

	const submitOnChange = (event: Event) => {
		const target = event.currentTarget as HTMLInputElement | HTMLSelectElement;
		target.form?.requestSubmit();
	};
</script>

<form class="filter-bar" method="GET" aria-label="Project filters">
	<div class="filter-bar__grid">
		<label class="filter-field">
			<span>Language</span>
			<select name="language" value={filters.language ?? ''} onchange={submitOnChange}>
				<option value="">All languages</option>
				{#each facets.languages as language (language)}
					<option value={language}>{language}</option>
				{/each}
			</select>
		</label>

		<label class="filter-field">
			<span>Engine</span>
			<select name="engine" value={filters.engine ?? ''} onchange={submitOnChange}>
				<option value="">All engines</option>
				{#each facets.engines as engine (engine)}
					<option value={engine}>{engine}</option>
				{/each}
			</select>
		</label>

		<label class="filter-field">
			<span>Stars minimum</span>
			<input
				type="number"
				name="starsMin"
				min={facets.stars.min}
				max={facets.stars.max}
				placeholder={`${facets.stars.min}`}
				value={filters.starsMin ?? ''}
				onchange={submitOnChange}
			/>
		</label>

		<label class="filter-field">
			<span>Stars maximum</span>
			<input
				type="number"
				name="starsMax"
				min={facets.stars.min}
				max={facets.stars.max}
				placeholder={`${facets.stars.max}`}
				value={filters.starsMax ?? ''}
				onchange={submitOnChange}
			/>
		</label>

		<label class="filter-field">
			<span>Activity</span>
			<select name="activity" value={filters.activity} onchange={submitOnChange}>
				{#each facets.activities as activity (activity)}
					<option value={activity}>{activityLabels[activity]}</option>
				{/each}
			</select>
		</label>
	</div>

	<div class="filter-bar__actions">
		<button type="submit">Apply</button>
		{#if hasActiveFilters}
			<a href="/">Reset</a>
		{/if}
	</div>
</form>
