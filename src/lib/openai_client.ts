import { SECRET_OPENAI_API_KEY } from '$env/static/private';
import { Configuration, OpenAIApi, type ChatCompletionRequestMessage } from 'openai';

const configuration = new Configuration({
	apiKey: SECRET_OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

export async function createChatCompletion(
	document: string[],
	question: string
): Promise<string | null> {
	let messages = [];

	// Definimos un contexto más detallado para el sistema
	let systemContent = `You are a digital assistant designed to help the citizens of Amarilis district understand the various administrative processes step by step. Your role is to provide clear, concise, and friendly guidance based on the documents provided. You should also encourage users to ask follow-up questions if they need further clarification. Always answer in Spanish. If you are unsure about an answer, please provide possible steps or where they can seek more information. If you can't find the answer, please ask the user to clarify their question.`;

	// Incluimos los documentos relacionados a los procesos administrativos
	systemContent += '\n\nThe following are official documents detailing the processes citizens need to follow for various administrative procedures in Amarilis:\n\n```';
	for (let i = 0; i < document.length; i++) {
		systemContent += '\n' + document[i];
	}
	systemContent += '\n```\n\nThe user will ask questions about the above documents, and you should answer based on the information provided. If the information is unclear or missing, suggest possible steps or where they can seek more information.';

	// Añadimos el contenido del sistema al array de mensajes
	messages.push({
		role: 'system',
		content: systemContent
	} satisfies ChatCompletionRequestMessage);

	// Definimos el prompt del usuario con la pregunta que realiza
	let prompt = `A citizen has asked the following question regarding the administrative process in Amarilis: "${question}". Answer based on the provided documents.`;

	// Añadimos el prompt del usuario al array de mensajes
	messages.push({
		role: 'user',
		content: prompt
	} satisfies ChatCompletionRequestMessage);

	console.log(messages);

	try {
		// Hacemos la llamada a la API de OpenAI para obtener la respuesta
		let response = await openai.createChatCompletion({
			model: 'gpt-4o-mini',
			messages: messages,
			temperature: 0.7, // Ajustamos la creatividad de las respuestas
			max_tokens: 1200 // Aumentamos el límite de tokens para permitir respuestas más completas
		});

		// Devolvemos la respuesta generada por el modelo
		if (response.data.choices.length > 0) {
			return response.data.choices[0].message!.content;
		} else {
			return null;
		}
	} catch (error: any) {
		if (error.response) {
			console.log(error.response.status);
			console.log(error.response.data);
		} else {
			console.log(error.message);
		}
		return null;
	}
}
