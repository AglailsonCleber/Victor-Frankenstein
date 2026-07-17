import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env.js';

const cache = new Map();
const aiClientInvalidation = new Set();

function guildsDir() {
    return path.join(process.cwd(), env.dataDir(), 'guilds');
}

function configPath(guildId) {
    return path.join(guildsDir(), `${guildId}.json`);
}

async function ensureDir() {
    await fs.mkdir(guildsDir(), { recursive: true });
}

export async function getGuildConfig(guildId) {
    if (cache.has(guildId)) {
        return { ...cache.get(guildId) };
    }

    try {
        const raw = await fs.readFile(configPath(guildId), 'utf8');
        const parsed = JSON.parse(raw);
        cache.set(guildId, parsed);
        return { ...parsed };
    } catch {
        return {};
    }
}

export async function getEffectiveApiConfig(guildId) {
    const guild = await getGuildConfig(guildId);

    return {
        tmdbBearerToken: guild.tmdbBearerToken || env.tmdbBearerToken() || null,
        googleApiKey: guild.googleApiKey || env.googleApiKey() || null,
        tmdbLanguage: guild.tmdbLanguage || env.tmdbLanguage(),
        tmdbWatchRegion: guild.tmdbWatchRegion || env.tmdbWatchRegion(),
        geminiModelName: guild.geminiModelName || env.geminiModelName(),
        geminiSystemInstruction:
            guild.geminiSystemInstruction || env.geminiSystemInstruction(),
    };
}

export async function setGuildConfig(guildId, updates) {
    await ensureDir();
    const current = await getGuildConfig(guildId);
    const merged = {
        ...current,
        ...Object.fromEntries(
            Object.entries(updates).filter(([, value]) => value !== undefined)
        ),
        updatedAt: new Date().toISOString(),
    };

    for (const key of ['tmdbBearerToken', 'googleApiKey']) {
        if (updates[key] !== undefined) {
            aiClientInvalidation.add(guildId);
        }
    }

    await fs.writeFile(configPath(guildId), JSON.stringify(merged, null, 2), 'utf8');
    cache.set(guildId, merged);
    return merged;
}

export async function clearGuildConfig(guildId, keys = null) {
    if (!keys) {
        cache.delete(guildId);
        aiClientInvalidation.add(guildId);
        try {
            await fs.unlink(configPath(guildId));
        } catch {
            // arquivo inexistente
        }
        return {};
    }

    const current = await getGuildConfig(guildId);
    for (const key of keys) {
        delete current[key];
    }
    return setGuildConfig(guildId, current);
}

export function maskSecret(value) {
    if (!value) return '(não definido)';
    if (value.length <= 8) return '********';
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function consumeAiClientInvalidation(guildId) {
    if (aiClientInvalidation.has(guildId)) {
        aiClientInvalidation.delete(guildId);
        return true;
    }
    return false;
}

export async function assertGuildApi(guildId, service) {
    const config = await getEffectiveApiConfig(guildId);

    if ((service === 'tmdb' || service === 'both') && !config.tmdbBearerToken) {
        throw new Error(
            'TMDB não configurado neste servidor. Um administrador deve usar `/config definir servico:TMDB`.'
        );
    }

    if ((service === 'gemini' || service === 'both') && !config.googleApiKey) {
        throw new Error(
            'Gemini não configurado neste servidor. Um administrador deve usar `/config definir servico:GEMINI`.'
        );
    }

    return config;
}
