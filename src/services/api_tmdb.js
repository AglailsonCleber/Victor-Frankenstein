// src/services/api_tmdb.js
const axios = require('axios');
require('dotenv').config();

const BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

/**
 * Busca filmes (movies) por título e retorna os resultados de uma página específica.
 * @param {string} title - Título do filme a ser buscado.
 * @param {number} page - O número da página a ser buscada (padrão: 1).
 * @returns {Promise<object>} Um objeto contendo: { movies: Array<object>, total_pages: number }
 */
async function searchMovieByTitle(title, page = 1) {
    if (!BEARER_TOKEN) {
        throw new Error("TMDB_BEARER_TOKEN não está configurada no arquivo .env.");
    }
    
    // Garantir que a página é um número válido e positivo
    const pageNumber = Math.max(1, page);

    try {
        const endpoint = `${BASE_URL}/search/movie`;
        
        const response = await axios.get(endpoint, {
            headers: {
                Authorization: `Bearer ${BEARER_TOKEN}`,
            },
            params: {
                query: title,
                language: 'pt-BR',
                page: pageNumber // <--- ENVIA O NÚMERO DA PÁGINA
            }
        });

        const data = response.data;

        if (!data.results || data.results.length === 0) {
            return { movies: [], total_pages: 0 };
        }

        // Mapeia os resultados da página atual
        const formattedMovies = data.results.map(movie => ({
            title: movie.title,
            originalTitle: movie.original_title,
            releaseDate: movie.release_date,
            overview: movie.overview || 'Sinopse não disponível.',
            voteAverage: movie.vote_average.toFixed(1),
            posterUrl: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : null,
            id: movie.id
        }));

        // Retorna a lista de filmes E o total de páginas
        return { 
            movies: formattedMovies, 
            total_pages: data.total_pages,
            current_page: data.page 
        };

    } catch (error) {
        if (error.response && error.response.status === 401) {
            throw new Error("Erro de Autenticação no TMDB. Verifique o TMDB_BEARER_TOKEN.");
        }
        console.error('Erro na requisição TMDB:', error.message);
        throw new Error(`Falha ao buscar filme. Erro: ${error.message}`);
    }
}

// No final do NOVO arquivo api_tmdb.js:
module.exports = { 
    searchMovieByTitle,
    searchTvByTitle,     // <-- AQUI ESTÁ A FUNÇÃO
    searchPersonByName   // <-- AQUI ESTÁ A FUNÇÃO
};