// src/services/api_tmdb.js
const axios = require('axios');
require('dotenv').config();

const BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

if (!BEARER_TOKEN) {
    console.error("ERRO CRÍTICO: TMDB_BEARER_TOKEN não está configurada no arquivo .env.");
}

// --- Cache para os Gêneros ---
// Não precisamos buscar isso da API toda vez.
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
 * @param {'movie' | 'tv'} type
 * @returns {Promise<Array<{id: number, name: string}>>}
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
 */
function formatResults(results, type) {
    return results.map(item => ({
        type: type,
        title: item.title || item.name, // 'name' para séries
        originalTitle: item.original_title || item.original_name,
        releaseDate: item.release_date || item.first_air_date || 'N/A', // 'first_air_date' para séries
        overview: item.overview || 'Sinopse não disponível.',
        voteAverage: item.vote_average.toFixed(1),
        posterUrl: item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : null,
        id: item.id
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
        results: formatResults(data.results, 'movie'), // <--- Usa o formatador
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
        results: formatResults(data.results, 'tv'), // <--- Usa o formatador
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

    // Formato de "pessoa" é diferente, não usa o formatador padrão
    const formattedResults = data.results.map(person => ({
        type: 'person',
        title: person.name,
        department: person.known_for_department || 'N/A',
        knownFor: person.known_for
            .map(item => item.title || item.name) 
            .join(', ') || 'Nenhum trabalho conhecido listado.',
        posterUrl: person.profile_path ? `${IMAGE_BASE_URL}${person.profile_path}` : null,
        id: person.id
    }));

    return { 
        results: formattedResults, 
        total_pages: data.total_pages,
        current_page: data.page 
    };
}

/**
 * (NOVO) Busca mídias (filme ou série) por ID de gênero.
 * @param {'movie' | 'tv'} type
 * @param {string} genreId - O ID do gênero
 */
async function discoverByGenre(type, genreId, page = 1) {
    const data = await tmdbGet(`/discover/${type}`, {
        with_genres: genreId,
        page: Math.max(1, page),
        sort_by: 'popularity.desc' // Ordena por popularidade
    });

    if (!data.results) return { results: [], total_pages: 0, current_page: 0 };

    return { 
        results: formatResults(data.results, type), // <--- Usa o formatador
        total_pages: data.total_pages,
        current_page: data.page 
    };
}


module.exports = { 
    searchMovieByTitle,
    searchTvByTitle,
    searchPersonByName,
    getGenreList,       // <-- EXPORTA A NOVA FUNÇÃO
    discoverByGenre     // <-- EXPORTA A NOVA FUNÇÃO
};