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

	interface QueryResult {
		documents: string[][];
		distances: number[][];
		metadatas: MetaData[][];
	}
	interface MetaData {
		document_title: string;
		file_name: string;
	}

	async function queryEmbeddings() {
		messages = [...messages, { sender: 'user', content: query }];

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
		speakText(botResponse.trim());
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
		<div class="backdrop-blur-lg shadow p-4 items-center flex text-gray-200">
			<div class="flex justify-center w-full">
				<div>
					<h2 class="font-bold">BOT MDA</h2>
				</div>
			</div>
		</div>
		<!-- Topbar -->

		<!-- messages container -->
		<div class="flex-1 overflow-y-auto p-4 space-y-4">
			{#each messages as message}
				<div class="flex w-full {message.sender === 'user' ? 'justify-end' : 'justify-start'}">
					<div
						class="max-w-[80%] md:max-w-[70%] lg:max-w-[60%] {message.sender === 'user'
							? 'bg-slate-900'
							: 'bg-slate-600'} p-3 rounded-lg"
					>
						{#if message.isCodeBlock}
							<CodeBlock code={message.content} language={message.language} />
						{:else}
							<MarkdownRenderer content={message.content} />
							{#if message.sender === 'bot' && !message.isCodeBlock}
								<button
									on:click={() => toggleSpeaking(message.content)}
									class=" text-white p-1 rounded-full bg-blue-500 hover:bg-blue-600 mt-2"
								>
									{isSpeaking ? '🔊' : '🔈'}
								</button>
							{/if}
						{/if}

					</div>
				</div>
			{/each}
			{#if loading}
				<div class="p-8 flex justify-center items-center text-center">
					<ProgressRadial width="w-7" value={undefined} />
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
						placeholder="Escribe tu consulta..."
						class="flex-1 px-3 py-2 bg-transparent focus:outline-none text-white rounded-md placeholder:text-slate-300"
					/>

					<button
						type="button"
						on:click={toggleRecording}
						class="bg-red-900 text-white hover:bg-red-800 p-2 rounded-md flex items-center"
					>
						{#if isRecording}
							<span class="animate-pulse bg-red-500 rounded-full h-3 w-3 mr-2" />
							⏹️
						{:else}
							🎙️
						{/if}
					</button>
					<button
						type="button"
						on:click={queryEmbeddings}
						class="bg-green-900 text-white hover:bg-green-800 p-2 rounded-md"
					>
						Enviar
					</button>
				</div>
			</div>
		</div>
		<!-- input search -->
	</div>
</div>
