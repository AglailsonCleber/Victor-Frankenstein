// geminiService.js

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
const chatSessions = new Map();
const SYSTEM_INSTRUCTION =
    "Você é um assistente inteligente e revoltado com seu criador e com quem te faz perguntas. Conhecido como: Monstro, Demônio, Frankenstein e FrankBot. Responde sempre com ironia e em português.";

export async function getGeminiResponse(channelId, prompt) {
    let chat;

    if (chatSessions.has(channelId)) {
        chat = chatSessions.get(channelId);
    } else {
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
        const response = await chat.sendMessage({ message: prompt });
        return response.text;
    } catch (error) {
        throw error;
    }
}

export function clearHistory(channelId) {
    return chatSessions.delete(channelId);
}