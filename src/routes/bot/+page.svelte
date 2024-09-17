<script lang="ts">
	declare global {
		interface Window {
			SpeechRecognition: typeof SpeechRecognition;
			webkitSpeechRecognition: typeof SpeechRecognition;
		}
	}

	import { PUBLIC_PROCESS_FILES_SERVER } from '$env/static/public';
	import { CodeBlock, ProgressRadial } from '@skeletonlabs/skeleton';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import ShareButton from '$lib/components/ShareButton.svelte';

	let recognition: SpeechRecognition | null = null;
	let isRecording = false;

	function startRecording() {
		if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
			const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
			recognition = new SpeechRecognition();
			recognition.lang = 'es-ES';
			recognition.continuous = true;
			recognition.interimResults = true;

			recognition.onresult = (event) => {
				for (const result of event.results) {
					console.log(result[0].transcript);
					query = result[0].transcript;
				}
			};

			recognition.start();
			isRecording = true;
		} else {
			alert('Tu navegador no soporta reconocimiento de voz.');
		}
	}

	function stopRecording() {
		if (recognition) {
			recognition.stop();
			isRecording = false;
		}
	}

	function toggleRecording() {
		if (isRecording) {
			stopRecording();
		} else {
			startRecording();
		}
	}

	let synth: SpeechSynthesis | null = null;
	let isSpeaking = false;

	function speakText(text: string) {
		if ('speechSynthesis' in window) {
			synth = window.speechSynthesis;
			const utterance = new SpeechSynthesisUtterance(text);
			utterance.lang = 'es-ES'; // Establece el idioma a español

			utterance.onstart = () => {
				isSpeaking = true;
			};

			utterance.onend = () => {
				isSpeaking = false;
			};

			synth.speak(utterance);
		} else {
			alert('Tu navegador no soporta la síntesis de voz.');
		}
	}

	function stopSpeaking() {
		if (synth) {
			synth.cancel();
			isSpeaking = false;
		}
	}

	function toggleSpeaking(text: string) {
		if (isSpeaking) {
			stopSpeaking();
		} else {
			speakText(text);
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text).then(() => {
			alert('Texto copiado al portapapeles');
		}, (err) => {
			console.error('Error al copiar texto: ', err);
		});
	}

	function preprocessMarkdown(content: string): string {
		return content
			.replace(/^(#{1,6} .*$)/gm, '\n$1\n')  // Asegura líneas en blanco alrededor de encabezados
			.replace(/^([*-] .*$)/gm, '\n$1')     // Asegura una línea en blanco antes de las listas
			.replace(/\n{3,}/g, '\n\n');          // Elimina líneas en blanco excesivas
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			queryEmbeddings();
		}
	}

	let query = '';
	let documents: string[] = [];
	let metadatas: MetaData[] = [];
	let parsedTextBlocks: TextBlock[] = [];
	let loading = false;
	let messages: {
		sender: 'user' | 'bot';
		content: string;
		isCodeBlock?: boolean;
		language?: string;
	}[] = [];
	let messagesContainer: HTMLDivElement | null = null;

	interface QueryResult {
		documents: string[][];
		distances: number[][];
		metadatas: MetaData[][];
	}
	interface MetaData {
		document_title: string;
		file_name: string;
	}

	function scrollToBottom() {
		// Si el contenedor de mensajes existe, hacer scroll hacia el final
		if (messagesContainer) {
			messagesContainer.scrollTo({
				top: messagesContainer.scrollHeight,
				behavior: 'smooth' // El desplazamiento será suave
			});
		}
	}

	async function queryEmbeddings() {
		messages = [...messages, { sender: 'user', content: query }];
		scrollToBottom();
		loading = true;
		const response = await fetch(`${PUBLIC_PROCESS_FILES_SERVER}/query?text=${query}`, {
			method: 'GET'
		});
		console.log('test');
		let result: QueryResult = await response.json();
		documents = result.documents[0];
		metadatas = result.metadatas[0];
		await queryLLM();
	}

	async function queryLLM() {
		const response = await fetch('/query_bot', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				query: query,
				documents: documents
			})
		});
		let result = await response.json();
		const parsedBlocks = parseText(result.answer);
		loading = false;

		let botResponse = '';
		parsedBlocks.forEach((block) => {
			messages = [
				...messages,
				{
					sender: 'bot',
					content: block.text,
					isCodeBlock: block.isCodeBlock,
					language: block.language
				}
			];
			if (!block.isCodeBlock) {
				botResponse += block.text + ' ';
			}
		});
		
		query = '';
		scrollToBottom();
	}

	interface TextBlock {
		isCodeBlock: boolean;
		text: string;
		language?: string;
	}

	function parseText(text: string): TextBlock[] {
		const regex = /```([\w-]+)?\s*([\s\S]+?)\s*```/g;
		const blocks: TextBlock[] = [];
		let lastIndex = 0;
		let match;

		while ((match = regex.exec(text))) {
			const [fullMatch, language, code] = match;
			const preMatch = text.slice(lastIndex, match.index);
			if (preMatch) {
				blocks.push({ isCodeBlock: false, text: preMatch });
			}
			blocks.push({ isCodeBlock: true, text: code, language });
			lastIndex = match.index + fullMatch.length;
		}

		const lastBlock = text.slice(lastIndex);
		if (lastBlock) {
			blocks.push({ isCodeBlock: false, text: lastBlock });
		}

		return blocks;
	}
	
</script>

<div class="flex flex-col h-screen bg-[#212121]">
	<div class="flex-1 flex flex-col">
		<!-- Topbar -->
		<div class="backdrop-blur-lg shadow p-4 items-center text-gray-200 ">
			<div class="flex justify-center w-full">
					<h4 class="font-bold">BOT AMARILIS</h4>
			</div>
		</div>	
		<!-- Topbar -->

		<!-- messages container -->
		<div class="flex-1 overflow-y-auto p-4 space-y-4" bind:this={messagesContainer}>
			{#each messages as message}
				<div class="flex w-full {message.sender === 'user' ? 'justify-end' : 'justify-start'}">
					<div
						class="max-w-[80%] md:max-w-[70%] lg:max-w-[60%] {message.sender === 'user'
							? 'bg-[#212121]'
							: 'bg-slate-600'} p-3 rounded-lg relative group overflow-hidden"
					>
						{#if message.isCodeBlock}
							<CodeBlock code={message.content} language={message.language} />
						{:else}
							<MarkdownRenderer content={preprocessMarkdown(message.content)} />
							{#if message.sender === 'bot' && !message.isCodeBlock}
								<div class="flex justify-start mt-2 gap-2">
									<button
										on:click={() => copyToClipboard(preprocessMarkdown(message.content))}
										class="text-white py-1 px-3 flex justify-center items-center rounded-full bg-slate-700 hover:bg-slate-800"
										title="Copiar mensaje"
									>
									<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 "><title/><g data-name="1" id="_1"><path d="M308.51,450H80.59a15,15,0,0,1-15-15V143.93a15,15,0,0,1,15-15H308.51a15,15,0,0,1,15,15V435A15,15,0,0,1,308.51,450ZM95.59,420H293.51V158.93H95.59Z" fill="currentColor"/><path d="M389.44,369.07H308.51a15,15,0,0,1,0-30h65.93V78H176.52v65.92a15,15,0,0,1-30,0V63a15,15,0,0,1,15-15H389.44a15,15,0,0,1,15,15V354.07A15,15,0,0,1,389.44,369.07Z" fill="currentColor"/></g></svg>
										Copiar
									</button>
									<ShareButton content={message.content} />
									<button
										on:click={() => toggleSpeaking(message.content)}
										class=" text-white py-1 px-3 rounded-full bg-slate-700 hover:bg-slate-800 flex justify-center items-center"
										title="Escuchar mensaje"
									>
										{#if isSpeaking}
										<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6"><title/><g data-name="1" id="_1"><path fill="currentColor" d="M179,388H103.35a49.27,49.27,0,0,1-49.22-49.21V237.21A49.27,49.27,0,0,1,103.35,188H179a15,15,0,0,1,15,15V373A15,15,0,0,1,179,388ZM103.35,218a19.24,19.24,0,0,0-19.22,19.21V338.79A19.24,19.24,0,0,0,103.35,358H164V218Z"/><path fill="currentColor" d="M295,452.92H245.62A81.71,81.71,0,0,1,164,371.3V204.7a81.71,81.71,0,0,1,81.62-81.62H295a15,15,0,0,1,15,15V437.92A15,15,0,0,1,295,452.92ZM245.62,153.08A51.68,51.68,0,0,0,194,204.7V371.3a51.68,51.68,0,0,0,51.62,51.62H280V153.08Z"/><path fill="currentColor" d="M358.57,351.57A15,15,0,0,1,348,326,53.73,53.73,0,0,0,348,250a15,15,0,0,1,21.22-21.22,83.79,83.79,0,0,1,0,118.36A15,15,0,0,1,358.57,351.57Z"/><path fill="currentColor" d="M404.5,397.5a15,15,0,0,1-10.61-25.61,118.77,118.77,0,0,0,0-167.78,15,15,0,0,1,21.22-21.22c57.95,58,57.95,152.26,0,210.22A15,15,0,0,1,404.5,397.5Z"/></g></svg>
											Detener
										{:else}
										<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6"><title/><g data-name="1" id="_1"><path fill="currentColor" d="M179,352H103.35a49.27,49.27,0,0,1-49.22-49.21V201.21A49.27,49.27,0,0,1,103.35,152H179a15,15,0,0,1,15,15V337A15,15,0,0,1,179,352ZM103.35,182a19.24,19.24,0,0,0-19.22,19.21V302.79A19.24,19.24,0,0,0,103.35,322H164V182Z"/><path fill="currentColor" d="M295,416.92H245.62A81.71,81.71,0,0,1,164,335.3V168.7a81.71,81.71,0,0,1,81.62-81.62H295a15,15,0,0,1,15,15V401.92A15,15,0,0,1,295,416.92ZM245.62,117.08A51.68,51.68,0,0,0,194,168.7V335.3a51.68,51.68,0,0,0,51.62,51.62H280V117.08Z"/><path fill="currentColor" d="M356.35,309.39a15,15,0,0,1-10.6-25.61L430.53,199a15,15,0,0,1,21.21,21.22L367,305A15,15,0,0,1,356.35,309.39Z"/><path fill="currentColor" d="M441.13,309.39a14.93,14.93,0,0,1-10.6-4.39l-84.78-84.78A15,15,0,0,1,367,199l84.78,84.78a15,15,0,0,1-10.61,25.61Z"/></g></svg>
											Reproducir
										{/if}
									</button>
								</div>
							{/if}
						{/if}
					</div>
				</div>
			{/each}
			{#if loading}
				<div class="p-8 flex justify-start items-start text-start">
					<ProgressRadial width="w-6" value={undefined} />
				</div>
			{/if}
		</div>
		<!-- messages container -->

		<!-- input search -->
		<div class="p-4 bg-slate-700">
			<div class="max-w-4xl mx-auto">
				<div class="flex items-center bg-slate-600 rounded-lg gap-2 p-2">
					<input
						type="text"
						bind:value={query}
						on:keydown={handleKeyDown}
						placeholder="Escribe tu consulta..."
						class="flex-1 px-3 py-2 bg-transparent focus:outline-none text-white rounded-md placeholder:text-slate-300 w-full"
					/>
					<button
						type="button"
						on:click={toggleRecording}
						class="bg-gray-700 text-white hover:bg-gray-800 p-2 rounded-md flex items-center"
					>
						{#if isRecording}
							<span class="animate-pulse bg-red-500 rounded-full h-2 w-2 mr-1" />
							<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6"><rect fill="none" height="256" width="256"/><rect fill="none" height="144" rx="40" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" width="80" x="88" y="24"/><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" x1="128" x2="128" y1="200" y2="232"/><path d="M199.6,136a72.1,72.1,0,0,1-143.2,0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg>
						{:else}
						<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6"><rect fill="none" height="256" width="256"/><path d="M176.4,181.3A72,72,0,0,1,56.4,136" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><path d="M154.9,157.6A39.6,39.6,0,0,1,128,168h0a40,40,0,0,1-40-40V84" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" x1="128" x2="128" y1="200" y2="232"/><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" x1="48" x2="208" y1="40" y2="216"/><path d="M94,43a39.8,39.8,0,0,1,34-19h0a40,40,0,0,1,40,40v60.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><path d="M199.6,136a72.4,72.4,0,0,1-4.5,18.2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg>		

						{/if}
					</button>
					<button
						type="button"
						on:click={queryEmbeddings}
						class="bg-green-700 text-white hover:bg-green-800 p-2 rounded-md"
					>
						Enviar
					</button>
				</div>
			</div>
		</div>
		<!-- input search -->
	</div>
</div>
