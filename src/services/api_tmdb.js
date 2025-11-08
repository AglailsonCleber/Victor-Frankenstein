// src/services/api_tmdb.js (ES Module)

import axios from 'axios'; // Mudar require('axios')
import { EmbedBuilder } from 'discord.js'; // Mudar require('discord.js')

// Se o seu index.js usa 'import 'dotenv/config'', as variáveis já estão no process.env
// require('dotenv').config(); // <-- REMOVIDO para evitar redundância e erro CJS

const BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

if (!BEARER_TOKEN) {
    console.error("ERRO CRÍTICO: TMDB_BEARER_TOKEN não está configurada no arquivo .env.");
}

// --- Cache para os Gêneros ---
let genreCache = {
    movie: null,
    tv: null,
};
// -----------------------------

/**
 * Função auxiliar genérica para requisições GET à API TMDB
 */
async function tmdbGet(endpoint, params = {}) {
    try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
            headers: {
                Authorization: `Bearer ${BEARER_TOKEN}`,
            },
            params: {
                ...params,
                language: 'pt-BR', // Definido globalmente
            }
        });
        return response.data;

    } catch (error) {
        if (error.response && error.response.status === 401) {
            throw new Error("Erro de Autenticação no TMDB. Verifique o TMDB_BEARER_TOKEN.");
        }
        console.error(`Erro na requisição TMDB (${endpoint}):`, error.message);
        throw new Error(`Falha ao buscar dados no TMDB. Erro: ${error.message}`);
    }
}

/**
 * Busca a lista de gêneros para 'movie' ou 'tv' e armazena em cache.
 */
export async function getGenreList(type) { // Adicionar export
    if (genreCache[type]) {
        return genreCache[type];
    }

    const data = await tmdbGet(`/genre/${type}/list`);

    if (!data.genres) {
        throw new Error(`Não foi possível buscar a lista de gêneros para ${type}.`);
    }

    genreCache[type] = data.genres;
    return data.genres;
}

/**
 * Formata os resultados da API (search ou discover) para o nosso formato padrão.
 */
function formatResults(results, type) { // Não precisa de export se for interno
    return results.map(item => ({
        type: type,
        title: item.title || item.name,
        originalTitle: item.original_title || item.original_name,
        originalLanguage: item.original_language,
        releaseDate: item.release_date || item.first_air_date || 'N/A',
        overview: item.overview || 'Sinopse não disponível.',
        voteAverage: item.vote_average,
        voteCount: item.vote_count,
        popularity: item.popularity,
        posterUrl: item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : null,
        backdrop_path: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null,
        id: item.id,
        adult: item.adult,
        video: item.video,
    }));
}


/**
 * Busca filmes (movies) por título.
 */
export async function searchMovieByTitle(title, page = 1) { // Adicionar export
    const data = await tmdbGet('/search/movie', {
        query: title,
        page: Math.max(1, page)
    });
    if (!data.results) return { results: [], total_pages: 0, current_page: 0 };
    return {
        results: formatResults(data.results, 'movie'),
        total_pages: data.total_pages,
        current_page: data.page
    };
}

/**
 * Busca séries de TV (tv) por título.
 */
export async function searchTvByTitle(title, page = 1) { // Adicionar export
    const data = await tmdbGet('/search/tv', {
        query: title,
        page: Math.max(1, page)
    });
    if (!data.results) return { results: [], total_pages: 0, current_page: 0 };
    return {
        results: formatResults(data.results, 'tv'),
        total_pages: data.total_pages,
        current_page: data.page
    };
}

/**
 * Busca pessoas (atores, diretores) por nome.
 */
export async function searchPersonByName(name, page = 1) { // Adicionar export
    const data = await tmdbGet('/search/person', {
        query: name,
        page: Math.max(1, page)
    });
    if (!data.results) return { results: [], total_pages: 0, current_page: 0 };

    // O formato de pessoa é diferente, então tem seu próprio formatador
    const formattedResults = data.results.map(person => ({
        type: 'person',
        title: person.name,
        department: person.known_for_department || 'N/A',
        knownFor: person.known_for
            .map(item => item.title || item.name)
            .join(', ') || 'Nenhum trabalho conhecido listado.',
        posterUrl: person.profile_path ? `${IMAGE_BASE_URL}${person.profile_path}` : null,
        id: person.id,
        popularity: person.popularity
    }));

    return {
        results: formattedResults,
        total_pages: data.total_pages,
        current_page: data.page
    };
}

/**
 * Busca mídias (filme ou série) por ID de gênero.
 */
export async function discoverByGenre(type, genreId, page = 1) { // Adicionar export
    const data = await tmdbGet(`/discover/${type}`, {
        with_genres: genreId,
        page: Math.max(1, page),
        sort_by: 'popularity.desc'
    });
    if (!data.results) return { results: [], total_pages: 0, current_page: 0 };
    return {
        results: formatResults(data.results, type),
        total_pages: data.total_pages,
        current_page: data.page
    };
}

/**
 * (NOVA FUNÇÃO) Busca os "Watch Providers" (Onde Assistir) para um filme ou série.
 */
export async function getWatchProviders(type, id, title) { // Adicionar export
    const data = await tmdbGet(`/${type}/${id}/watch/providers`);
    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`Onde Assistir: ${title}`);

    const providers = data.results?.BR; // Foca nos resultados do Brasil

    if (!providers) {
        embed.setDescription('Informações de *Onde Assistir* não disponíveis para o Brasil.');
        return embed;
    }

    const { flatrate, rent, buy, link } = providers;

    // Função auxiliar para mapear nomes
    const mapProviders = (list) => {
        if (!list || list.length === 0) return 'Nenhuma opção encontrada.';
        return list.map(p => `• ${p.provider_name}`).join('\n');
    };

    embed.addFields(
        { name: '📺 Streaming (Incluso)', value: mapProviders(flatrate), inline: true },
        { name: '🎟️ Alugar', value: mapProviders(rent), inline: true },
        { name: '💳 Comprar', value: mapProviders(buy), inline: true }
    );

    if (link) {
        embed.setURL(link); // Link direto para o TMDB com mais opções
        embed.setFooter({ text: 'Fonte: TMDB (JustWatch). Clique no título para ver mais opções.' });
    } else {
        embed.setFooter({ text: 'Fonte: TMDB (JustWatch)' });
    }

    return embed;
}

// Em ES Modules, você exporta as funções diretamente, em vez de usar module.exports
// Não há mais necessidade de um bloco module.exports.