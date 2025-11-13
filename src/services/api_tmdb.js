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
        console.error(`[TMDB ERROR] Erro na requisição para ${endpoint}: ${error.message}`);
        throw new Error(`Falha na API TMDB: ${error.response?.status} - ${error.response?.data?.status_message || error.message}`);
    }
}

// ===================================================================
// FUNÇÃO 1: PESQUISA POR TÍTULO (Filme)
// ===================================================================

/**
 * Pesquisa filmes por título.
 * @param {string} title O título a ser pesquisado.
 * @param {number} page A página de resultados a ser buscada.
 */
export async function searchMovieByTitle(title, page = 1) {
    return tmdbGet('/search/movie', { query: title, page: page });
}

// ===================================================================
// FUNÇÃO 2: PESQUISA POR TÍTULO (Série de TV)
// ===================================================================

/**
 * Pesquisa séries de TV por título.
 * @param {string} title O título a ser pesquisado.
 * @param {number} page A página de resultados a ser buscada.
 */
export async function searchTvByTitle(title, page = 1) {
    return tmdbGet('/search/tv', { query: title, page: page });
}

// ===================================================================
// FUNÇÃO 3: PESQUISA POR NOME (Pessoa)
// ===================================================================

/**
 * Pesquisa pessoas (atores, diretores, etc.) por nome.
 * @param {string} name O nome a ser pesquisado.
 * @param {number} page A página de resultados a ser buscada.
 */
export async function searchPersonByName(name, page = 1) {
    return tmdbGet('/search/person', { query: name, page: page });
}


// ===================================================================
// FUNÇÃO 4: OBTENÇÃO E CACHE DE LISTA DE GÊNEROS
// ===================================================================

/**
 * Obtém a lista de gêneros para filmes ou TV (usando cache).
 * @param {'movie' | 'tv'} type O tipo de mídia (movie ou tv).
 */
export async function getGenreList(type) {
    if (genreCache[type]) {
        console.log(`[TMDB] Usando cache para gêneros de ${type}.`);
        return genreCache[type];
    }
    
    console.log(`[TMDB] Buscando gêneros de ${type} na API...`);
    const data = await tmdbGet(`/genre/${type}/list`);
    
    // Armazena a lista de gêneros no cache.
    genreCache[type] = data.genres;
    return data.genres;
}

// ===================================================================
// FUNÇÃO 5: DISCOVER (Pesquisa por Gênero/Filtro)
// ===================================================================

/**
 * Realiza uma pesquisa avançada (Discover) por gênero.
 * @param {'movie' | 'tv'} type O tipo de mídia.
 * @param {number} genreId O ID do gênero.
 * @param {number} page A página de resultados.
 */
export async function discoverByGenre(type, genreId, page = 1) {
    return tmdbGet(`/discover/${type}`, { with_genres: genreId, page: page });
}

// ===================================================================
// FUNÇÃO 6: ONDE ASSISTIR (Watch Providers)
// ===================================================================

/**
 * Obtém os provedores de streaming (onde assistir) para um filme ou série.
 * @param {'movie' | 'tv'} type O tipo de mídia.
 * @param {number} id O ID do filme ou série.
 * @param {string} title O título do filme/série para o embed.
 * @returns {Promise<EmbedBuilder>} Um Embed contendo as informações dos provedores.
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
    }

    return embed;
}