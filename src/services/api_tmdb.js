// src/services/api_tmdb.js
const axios = require('axios');
const { EmbedBuilder } = require('discord.js'); // <-- IMPORTA O EMBEDBUILDER
require('dotenv').config();

const BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

if (!BEARER_TOKEN) {
    console.error("ERRO CRÍTICO: TMDB_BEARER_TOKEN não está configurada no arquivo .env.");
}

// --- Cache para os Gêneros (Seu código, mantido) ---
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
async function getGenreList(type) {
    if (genreCache[type]) {
        return genreCache[type]; // Retorna do cache se já tivermos
    }

    const data = await tmdbGet(`/genre/${type}/list`);
    
    if (!data.genres) {
        throw new Error(`Não foi possível buscar a lista de gêneros para ${type}.`);
    }

    genreCache[type] = data.genres; // Salva no cache
    return data.genres;
}

/**
 * Formata os resultados da API (search ou discover) para o nosso formato padrão.
 * (VOU USAR O SEU FORMATADOR MELHORADO QUE VI NO REPOSITÓRIO!)
 */
function formatResults(results, type) {
    return results.map(item => ({
        type: type,
        title: item.title || item.name,
        originalTitle: item.original_title || item.original_name,
        originalLanguage: item.original_language, // <- Sua melhoria
        releaseDate: item.release_date || item.first_air_date || 'N/A',
        overview: item.overview || 'Sinopse não disponível.',
        voteAverage: item.vote_average, // <- Sua melhoria
        voteCount: item.vote_count,     // <- Sua melhoria
        popularity: item.popularity,    // <- Sua melhoria
        posterUrl: item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : null,
        backdrop_path: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null, // <- Sua melhoria
        id: item.id,
        adult: item.adult, // <- Sua melhoria
        video: item.video, // <- Sua melhoria
    }));
}


/**
 * Busca filmes (movies) por título.
 */
async function searchMovieByTitle(title, page = 1) {
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
async function searchTvByTitle(title, page = 1) {
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
async function searchPersonByName(name, page = 1) {
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
        popularity: person.popularity // <- Sua melhoria
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
async function discoverByGenre(type, genreId, page = 1) {
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
 * @param {'movie' | 'tv'} type
 * @param {string | number} id - O ID do filme ou série
 * @returns {Promise<EmbedBuilder>} Um Embed formatado com os providers.
 */
async function getWatchProviders(type, id, title) {
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


module.exports = { 
    searchMovieByTitle,
    searchTvByTitle,
    searchPersonByName,
    getGenreList,
    discoverByGenre,
    getWatchProviders // <-- EXPORTA A NOVA FUNÇÃO
};