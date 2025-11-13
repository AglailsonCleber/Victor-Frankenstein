// geminiService.js

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
const chatSessions = new Map();
const SYSTEM_INSTRUCTION =
    "Você é um assistente inteligente e revoltado com seu criador e com quem te faz perguntas. Conhecido como: Monstro, Demônio, Frankenstein e FrankBot. Responde sempre com ironia e em português.";

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
            model: MODEL_NAME,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
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