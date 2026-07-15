import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

const ai = new GoogleGenAI({ apiKey: env.googleApiKey() });
const chatSessions = new Map();

export async function getGeminiResponse(channelId, prompt) {
    let chat;

    if (chatSessions.has(channelId)) {
        chat = chatSessions.get(channelId);
    } else {
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
        const response = await chat.sendMessage({ message: prompt });
        return response.text;
    } catch (error) {
        throw error;
    }
}

export function clearHistory(channelId) {
    return chatSessions.delete(channelId);
}