import axios from 'axios';
import { EmbedBuilder } from 'discord.js';
import { getEffectiveApiConfig, assertGuildApi } from './guildConfigStore.js';

const BASE_URL = 'https://api.themoviedb.org/3';
const genreCache = new Map();

function genreCacheKey(guildId, type) {
    return `${guildId}:${type}`;
}

async function tmdbGet(guildId, endpoint, params = {}) {
    const config = await assertGuildApi(guildId, 'tmdb');

    try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
            headers: {
                Authorization: `Bearer ${config.tmdbBearerToken}`,
            },
            params: {
                ...params,
                language: config.tmdbLanguage,
            },
        });
        return response.data;
    } catch (error) {
        console.error(`[TMDB ERROR] Erro na requisição para ${endpoint}: ${error.message}`);
        throw new Error(
            `Falha na API TMDB: ${error.response?.status ?? ''} ${error.response?.data?.status_message || error.message}`.trim()
        );
    }
}

export async function searchMovieByTitle(guildId, title, page = 1) {
    return tmdbGet(guildId, '/search/movie', { query: title, page });
}

export async function searchTvByTitle(guildId, title, page = 1) {
    return tmdbGet(guildId, '/search/tv', { query: title, page });
}

export async function searchPersonByName(guildId, name, page = 1) {
    return tmdbGet(guildId, '/search/person', { query: name, page });
}

export async function getGenreList(guildId, type) {
    const key = genreCacheKey(guildId, type);
    if (genreCache.has(key)) {
        return genreCache.get(key);
    }

    const data = await tmdbGet(guildId, `/genre/${type}/list`);
    genreCache.set(key, data.genres);
    return data.genres;
}

export async function discoverByGenre(guildId, type, genreId, page = 1) {
    return tmdbGet(guildId, `/discover/${type}`, {
        with_genres: genreId,
        page,
    });
}

export async function getWatchProviders(guildId, type, id, title) {
    const config = await getEffectiveApiConfig(guildId);
    const data = await tmdbGet(guildId, `/${type}/${id}/watch/providers`);

    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`Onde Assistir: ${title}`);

    const providers = data.results?.[config.tmdbWatchRegion];

    if (!providers) {
        embed.setDescription(
            `Informações de *Onde Assistir* não disponíveis para a região ${config.tmdbWatchRegion}.`
        );
        return embed;
    }

    const { flatrate, rent, buy, link } = providers;
    const mapProviders = (list) => {
        if (!list?.length) return 'Nenhuma opção encontrada.';
        return list.map((p) => `• ${p.provider_name}`).join('\n');
    };

    embed.addFields(
        { name: '📺 Streaming (Incluso)', value: mapProviders(flatrate), inline: true },
        { name: '🎟️ Alugar', value: mapProviders(rent), inline: true },
        { name: '💳 Comprar', value: mapProviders(buy), inline: true }
    );

    if (link) {
        embed.setURL(link);
        embed.setFooter({ text: 'Fonte: TMDB (JustWatch). Clique no título para ver mais opções.' });
    }

    return embed;
}

export function invalidateGenreCache(guildId) {
    for (const key of genreCache.keys()) {
        if (key.startsWith(`${guildId}:`)) {
            genreCache.delete(key);
        }
    }
}
