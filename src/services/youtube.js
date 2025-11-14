// src/services/youtube.js

import ytdl from 'ytdl-core';
import yts from 'yt-search';

// ----------------------------------------------------------------------
// Função para resolver consultas do YouTube (link direto ou pesquisa)
// ----------------------------------------------------------------------

/**
 * Resolve a consulta buscando o URL do YouTube e metadados.
 * @param {string} query Link do YouTube ou termo de busca.
 * @returns {Promise<{youtubeUrl: string, trackInfo: {title: string, artist: string, duration: number, thumbnail: string}, source: string}|null>}
 */
export async function resolveYoutubeQuery(query) {
    let youtubeUrl = null;
    let trackInfo = { title: null, artist: null, duration: 0, thumbnail: null };
    let source = 'Busca';

    if (ytdl.validateURL(query)) {
        console.log(`[YT-DIRECT] 🔗 Link do YouTube detectado: ${query}`);
        
        try {
            console.log(`[YT-DIRECT] ⏳ Obtendo metadados do YouTube...`);
            const info = await ytdl.getBasicInfo(query);
            
            youtubeUrl = query;
            trackInfo.title = info.videoDetails.title;
            trackInfo.artist = info.videoDetails.author.name || 'Artista Desconhecido';
            trackInfo.duration = parseInt(info.videoDetails.lengthSeconds, 10) || 0;
            // Pega a melhor miniatura disponível
            trackInfo.thumbnail = info.videoDetails.thumbnails.find(t => t.quality === 'maxresdefault')?.url || info.videoDetails.thumbnails[0]?.url; 
            source = 'YouTube Direto';
            
            console.log(`[YT-DIRECT] 🎯 URL direta detectada: ${youtubeUrl}`);
            
        } catch (e) {
            console.error('❌ Erro ao obter metadados do link do YouTube:', e.message);
            return null;
        }

    } else {
        // É uma busca (ou foi resolvido via Spotify)
        try {
            console.log(`[YT-SEARCH] 🔎 Buscando no YouTube: "${query}"`);

            const results = await yts(query);
            // Pega o primeiro vídeo válido
            const video = results.videos.find(v => v.duration.seconds > 0 && v.url);

            if (!video) {
                console.log(`[YT-SEARCH] ❌ Nenhum resultado encontrado no YouTube para: ${query}`);
                return null;
            }

            youtubeUrl = video.url;
            trackInfo.title = video.title;
            trackInfo.artist = video.author.name || 'Artista Desconhecido';
            trackInfo.duration = video.duration.seconds || 0;
            trackInfo.thumbnail = video.image || null;
            source = 'Busca';

            console.log(`[YT-SEARCH] ✅ Vídeo encontrado: ${video.title}`);
        } catch (error) {
            console.error('❌ Erro ao pesquisar no YouTube:', error);
            return null;
        }
    }
    
    return { youtubeUrl, trackInfo, source };
}