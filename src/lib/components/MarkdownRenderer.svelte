<script lang="ts">
	import { marked } from 'marked';
	import { onMount } from 'svelte';

	export let content: string = '';

	let htmlContent: string = '';

	// Convierte el contenido de Markdown a HTML cuando el componente se monta
	onMount(() => {
		htmlContent = marked(content);
	});
</script>

<!-- Renderiza el contenido HTML generado desde Markdown -->
<div class="markdown" bind:innerHTML={htmlContent} contenteditable />

<style>
	.markdown {
		/* Estilos personalizados para tu markdown */
	}
	a {
		color: rgb(47, 172, 255) !important;
	}
</style>
