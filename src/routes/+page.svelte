<script lang="ts">
	import { FileDropzone, ProgressBar } from '@skeletonlabs/skeleton';
	import { PUBLIC_PROCESS_FILES_SERVER } from '$env/static/public';
	import { goto } from '$app/navigation';

	let files: FileList;
	let processing = false;
	let error = false;

	function onChangeHandler(e: Event): void {
		files = files;
	}

	async function startProcessing(event: Event) {
		processing = true;
		const formEl = event.target as HTMLFormElement;
		const data = new FormData(formEl);
		const response = await fetch(`${PUBLIC_PROCESS_FILES_SERVER}/process`, {
			method: 'POST',
			body: data
		});
		let result = await response.json();
		if (result && result.success) {
			goto('/bot');
		} else {
			error = true;
		}
		processing = false;
	}
</script>

<div class="flex flex-col h-screen bg-[#212121]">
	<div class="flex-1 flex flex-col">
		<!-- Topbar -->
		<div class="backdrop-blur-lg shadow p-4 items-center flex text-gray-200">
			<div class="flex justify-center w-full">
				<div>
					<h2 class="font-bold">🤖 Bot Amarilis - Subir Archivos</h2>
				</div>
			</div>
		</div>
		<!-- Topbar -->

		<!-- File upload container -->
		<div class="flex-1 overflow-y-auto p-4 space-y-4">
			<form
				method="POST"
				on:submit|preventDefault={startProcessing}
				class="w-full max-w-4xl mx-auto"
			>
				<div class="bg-slate-700 p-6 rounded-lg">
					<FileDropzone
						name="documents"
						multiple
						bind:files
						on:change={onChangeHandler}
						class="!bg-slate-600 border-dashed border-2 !border-slate-200 p-8 rounded-lg text-center"
					>
						<svelte:fragment slot="lead">
							<svg
								height="35px"
								class="text-white mx-auto mb-4"
								viewBox="0 0 1792 1792"
								fill="currentColor"
								xmlns="http://www.w3.org/2000/svg"
								><path
									d="M1344 1472q0-26-19-45t-45-19-45 19-19 45 19 45 45 19 45-19 19-45zm256 0q0-26-19-45t-45-19-45 19-19 45 19 45 45 19 45-19 19-45zm128-224v320q0 40-28 68t-68 28h-1472q-40 0-68-28t-28-68v-320q0-40 28-68t68-28h427q21 56 70.5 92t110.5 36h256q61 0 110.5-36t70.5-92h427q40 0 68 28t28 68zm-325-648q-17 40-59 40h-256v448q0 26-19 45t-45 19h-256q-26 0-45-19t-19-45v-448h-256q-42 0-59-40-17-39 14-69l448-448q18-19 45-19t45 19l448 448q31 30 14 69z"
								/></svg
							>
						</svelte:fragment>
						<svelte:fragment slot="message">
							<span class="text-gray-300">(Subir archivos o arrastrarlos)</span>
						</svelte:fragment>
						<svelte:fragment slot="meta">
							<span class="text-gray-400">(TXT Y MD permitidos)</span>
						</svelte:fragment>
					</FileDropzone>

					{#if files}
						<div class="mt-4 bg-slate-600 p-4 rounded-lg">
							<h3 class="text-white mb-2">Archivos seleccionados:</h3>
							<ol class="list w-full space-y-2">
								{#each Array.from(files) as document, i}
									<li class="flex items-center text-gray-300">
										<span class="badge-icon p-2 bg-blue-500 text-white rounded-full mr-2"
											>{i + 1}</span
										>
										<span>{document.name}</span>
									</li>
								{/each}
							</ol>
						</div>
						<button
							class="w-full btn bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg mt-4"
							disabled={processing}
						>
							{processing ? 'Procesando...' : 'Guardar información'}
						</button>
					{/if}
				</div>
			</form>

			{#if processing}
				<div class="bg-slate-700 p-4 rounded-lg mt-4 max-w-4xl mx-auto">
					<p class="text-white mb-2">Procesando archivos...</p>
					<ProgressBar height="h-2" meter="bg-blue-500" track="bg-slate-600" />
				</div>
			{/if}

			{#if error}
				<div class="bg-red-600 text-white p-4 rounded-lg mt-4 max-w-4xl mx-auto">
					<h3 class="font-bold">Error al procesar los archivos</h3>
					<p>Por favor, intente nuevamente.</p>
				</div>
			{/if}
		</div>
		<!-- File upload container -->
	</div>
</div>
