import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import {
    assertGuildApi,
    consumeAiClientInvalidation,
    getEffectiveApiConfig,
} from './guildConfigStore.js';

const chatSessions = new Map();
const aiClients = new Map();

function sessionKey(guildId, channelId) {
    return `${guildId}:${channelId}`;
}

function evictStaleSessions() {
    const now = Date.now();
    const ttl = env.geminiSessionTtlMs();
    const maxSessions = env.maxGeminiSessions();

    for (const [key, session] of chatSessions.entries()) {
        if (now - session.lastAccess > ttl) {
            chatSessions.delete(key);
        }
    }

    if (chatSessions.size <= maxSessions) {
        return;
    }

    const sorted = [...chatSessions.entries()].sort(
        (a, b) => a[1].lastAccess - b[1].lastAccess
    );

    while (chatSessions.size > maxSessions) {
        const [oldestKey] = sorted.shift();
        chatSessions.delete(oldestKey);
    }
}

async function getAiClient(guildId) {
    if (consumeAiClientInvalidation(guildId)) {
        aiClients.delete(guildId);
    }

    const config = await assertGuildApi(guildId, 'gemini');

    if (!aiClients.has(guildId)) {
        aiClients.set(guildId, new GoogleGenAI({ apiKey: config.googleApiKey }));
    }

    return { client: aiClients.get(guildId), config };
}

export async function getGeminiResponse(guildId, channelId, prompt) {
    evictStaleSessions();

    const key = sessionKey(guildId, channelId);
    const { client, config } = await getAiClient(guildId);
    let session = chatSessions.get(key);

    if (!session) {
        const chat = client.chats.create({
            model: config.geminiModelName,
            config: {
                systemInstruction: config.geminiSystemInstruction,
            },
        });

        session = { chat, lastAccess: Date.now() };
        chatSessions.set(key, session);
    }

    session.lastAccess = Date.now();

    const response = await session.chat.sendMessage({ message: prompt });
    return response.text;
}

export function clearHistory(guildId, channelId) {
    return chatSessions.delete(sessionKey(guildId, channelId));
}

export function clearGuildSessions(guildId) {
    for (const key of chatSessions.keys()) {
        if (key.startsWith(`${guildId}:`)) {
            chatSessions.delete(key);
        }
    }
    aiClients.delete(guildId);
}
