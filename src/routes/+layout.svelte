<script>
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<meta name="color-scheme" content="light dark" />
</svelte:head>

{@render children()}
