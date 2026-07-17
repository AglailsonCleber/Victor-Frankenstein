import yts from 'yt-search';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ytdlpCommand, YTDLP_YOUTUBE_ARGS } from '../utils/ytdlpYouTube.js';

const execFileAsync = promisify(execFile);

const YOUTUBE_URL_REGEX =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]+/i;

export function isYoutubeUrl(query) {
    return YOUTUBE_URL_REGEX.test(query.trim());
}

async function fetchMetadataWithYtDlp(url) {
    const { stdout } = await execFileAsync(
        ytdlpCommand(),
        [url, ...YTDLP_YOUTUBE_ARGS, '--dump-single-json', '--skip-download'],
        { maxBuffer: 10 * 1024 * 1024 }
    );

    const data = JSON.parse(stdout);

    return {
        youtubeUrl: data.webpage_url || data.original_url || url,
        trackInfo: {
            title: data.title || 'Sem título',
            artist: data.uploader || data.channel || 'Artista Desconhecido',
            duration: data.duration || 0,
            thumbnail: data.thumbnail || null,
        },
        source: 'YouTube Direto',
    };
}

/**
 * Resolve link direto ou busca no YouTube via yt-search + metadados via yt-dlp.
 */
export async function resolveYoutubeQuery(query) {
    const trimmed = query.trim();

    if (isYoutubeUrl(trimmed)) {
        try {
            console.log(`[YT-DIRECT] 🔗 Link detectado: ${trimmed}`);
            const result = await fetchMetadataWithYtDlp(trimmed);
            console.log(`[YT-DIRECT] ✅ ${result.trackInfo.title}`);
            return result;
        } catch (error) {
            console.error('[YT-DIRECT] ❌ yt-dlp metadata:', error.message);
            return null;
        }
    }

    try {
        console.log(`[YT-SEARCH] 🔎 Buscando no YouTube: "${trimmed}"`);
        const results = await yts(trimmed);
        const video = results.videos.find((v) => v.duration.seconds > 0 && v.url);

        if (!video) {
            console.log(`[YT-SEARCH] ❌ Nenhum resultado para: ${trimmed}`);
            return null;
        }

        console.log(`[YT-SEARCH] ✅ Vídeo encontrado: ${video.title}`);

        return {
            youtubeUrl: video.url,
            trackInfo: {
                title: video.title,
                artist: video.author.name || 'Artista Desconhecido',
                duration: video.duration.seconds || 0,
                thumbnail: video.image || null,
            },
            source: 'Busca',
        };
    } catch (error) {
        console.error('[YT-SEARCH] ❌ Erro:', error.message);
        return null;
    }
}
