import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

const ai = new GoogleGenAI({ apiKey: env.googleApiKey() });
const chatSessions = new Map();

/**
 * Envia uma prompt ao modelo Gemini, mantendo o contexto para o canal especificado.
 * @param {string} channelId O ID do canal do Discord para gerenciar a sessão de chat.
 * @param {string} prompt A mensagem do usuário a ser enviada ao Gemini.
 * @returns {Promise<string>} A resposta de texto do modelo.
 */
export async function getGeminiResponse(channelId, prompt) {
    let chat;

    // 1. Tenta obter uma sessão de chat existente
    if (chatSessions.has(channelId)) {
        chat = chatSessions.get(channelId);
    } else {
        // 2. Cria uma nova sessão de chat se não existir
        console.log(`[Gemini Service] Criando nova sessão para o canal: ${channelId}`);
        chat = ai.chats.create({
            model: env.geminiModelName(),
            config: {
                systemInstruction: env.geminiSystemInstruction(),
            }
        });
        chatSessions.set(channelId, chat);
    }

    try {
        // 3. Envia a mensagem e obtém a resposta
        const response = await chat.sendMessage({ message: prompt });
        return response.text;
    } catch (error) {
        // Propaga o erro para ser tratado no comando slash
        throw error;
    }
}

/**
 * Limpa o histórico de uma sessão de chat específica.
 * @param {string} channelId O ID do canal.
 * @returns {boolean} True se o histórico foi deletado com sucesso, false caso contrário.
 */
export function clearHistory(channelId) {
    return chatSessions.delete(channelId);
}