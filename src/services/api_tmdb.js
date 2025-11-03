// src/services/api_tmdb.js
const axios = require('axios');
require('dotenv').config();

const BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

if (!BEARER_TOKEN) {
    console.error("ERRO CRÍTICO: TMDB_BEARER_TOKEN não está configurada no arquivo .env.");
}

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
 * Busca filmes (movies) por título.
 */
async function searchMovieByTitle(title, page = 1) {
    const data = await tmdbGet('/search/movie', {
        query: title,
        page: Math.max(1, page)
    });

    if (!data.results || data.results.length === 0) {
        return { results: [], total_pages: 0, current_page: 0 };
    }

    const formattedResults = data.results.map(movie => ({
        type: 'movie',
        title: movie.title,
        originalTitle: movie.original_title,
        releaseDate: movie.release_date || 'N/A',
        overview: movie.overview || 'Sinopse não disponível.',
        voteAverage: movie.vote_average.toFixed(1),
        posterUrl: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : null,
        id: movie.id
    }));

    return { 
        results: formattedResults, 
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

    if (!data.results || data.results.length === 0) {
        return { results: [], total_pages: 0, current_page: 0 };
    }

    const formattedResults = data.results.map(tv => ({
        type: 'tv',
        title: tv.name, // Campo 'name' para séries
        originalTitle: tv.original_name,
        releaseDate: tv.first_air_date || 'N/A', // Campo 'first_air_date'
        overview: tv.overview || 'Sinopse não disponível.',
        voteAverage: tv.vote_average.toFixed(1),
        posterUrl: tv.poster_path ? `${IMAGE_BASE_URL}${tv.poster_path}` : null,
        id: tv.id
    }));

    return { 
        results: formattedResults, 
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

    if (!data.results || data.results.length === 0) {
        return { results: [], total_pages: 0, current_page: 0 };
    }

    const formattedResults = data.results.map(person => ({
        type: 'person',
        title: person.name,
        department: person.known_for_department || 'N/A',
        knownFor: person.known_for
            .map(item => item.title || item.name) // Mídia pode ser filme (title) ou tv (name)
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


module.exports = { 
    searchMovieByTitle,
    searchTvByTitle,     // <-- É ESTA LINHA QUE CORRIGE O ERRO
    searchPersonByName   // <-- E ESTA
};