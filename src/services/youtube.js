// src/services/youtube.js

import ytdl from 'ytdl-core';
import yts from 'yt-search';
// A importação de 'interaction' não é necessária neste módulo, pois é uma função de serviço pura.

// ----------------------------------------------------------------------
// Função para resolver consultas do YouTube (link direto ou pesquisa)
// ----------------------------------------------------------------------

/**
 * Resolve a consulta de mídia (link direto do YouTube ou termo de pesquisa) 
 * para obter a URL e os metadados finais.
 * * @param {string} query O termo de busca ou URL (pode ser a query resolvida do Spotify).
 * @param {{artist: string, title: string}} [trackInfo] Metadados iniciais (se vierem do Spotify).
 * @param {string} [source] A fonte inicial da query ('Busca' ou 'Spotify').
 * @returns {Promise<{youtubeUrl: string, trackInfo: {artist: string, title: string}, source: string} | null>}
 * Retorna um objeto com os dados da faixa ou null em caso de falha.
 */
export async function resolveYoutubeQuery(query, trackInfo = {}, source = 'Busca') {
    let youtubeUrl = null;
    let finalSource = source;
    // Cria um objeto de metadados padrão se não for fornecido
    let finalTrackInfo = { 
        artist: trackInfo.artist || 'Desconhecido', 
        title: trackInfo.title || 'Música Desconhecida'
    }; 

    // 1. Tenta validar se é um link direto do YouTube
    if (ytdl.validateURL(query)) {
        console.log(`[YT-DIRECT] 🔗 Link do YouTube detectado: ${query}`);
        try {
            console.log(`[YT-DIRECT] ⏳ Obtendo metadados do YouTube...`);
            
            // Usamos getBasicInfo, que é mais leve que getInfo completo
            const info = await ytdl.getBasicInfo(query);
            
            youtubeUrl = query;
            finalTrackInfo.title = info.videoDetails.title;
            finalTrackInfo.artist = info.videoDetails.author.name || 'Artista Desconhecido';
            finalSource = 'YouTube Direto';
            
            console.log(`[YT-DIRECT] ✅ Metadados obtidos: ${finalTrackInfo.title}`);

        } catch (e) {
            console.error('[YT-DIRECT] ❌ Link do YouTube inválido ou indisponível:', e.message);
            return null; // Falha
        }

    } else {
        // 2. É uma busca (termo de pesquisa ou query resolvida do Spotify)
        try {
            console.log(`[YT-SEARCH] 🔎 Buscando no YouTube: "${query}"`);

            const results = await yts(query);
            // Pega o primeiro resultado de vídeo
            const video = results.videos.filter(v => v.type === 'video')[0];

            if (!video) {
                console.log(`[YT-SEARCH] ❌ Nenhum resultado encontrado para: "${query}"`);
                return null;
            }

            youtubeUrl = video.url;
            
            // Se a fonte *NÃO* foi o Spotify (que já injetou metadados), 
            // usa os metadados do resultado da busca do YouTube
            if (finalSource !== 'Spotify') {
                finalTrackInfo.title = video.title;
                finalTrackInfo.artist = video.author.name || 'Artista Desconhecido';
                finalSource = 'Busca';
            }
            
            // Tenta obter a miniatura de melhor qualidade, se disponível
            const thumbnailUrl = video.image?.replace('mqdefault', 'hqdefault') || video.thumbnail;
            
            // Adicionamos a miniatura à informação da faixa
            finalTrackInfo.thumbnail = thumbnailUrl;

            console.log(`[YT-SEARCH] ✅ Vídeo encontrado: ${finalTrackInfo.title}`);

        } catch (error) {
            console.error('❌ Erro ao pesquisar no YouTube:', error);
            return null;
        }
    }
    
    // 3. Retorna o resultado final (incluindo URL do YouTube e metadados)
    return { 
        youtubeUrl: youtubeUrl, 
        trackInfo: finalTrackInfo, 
        source: finalSource 
    };
}