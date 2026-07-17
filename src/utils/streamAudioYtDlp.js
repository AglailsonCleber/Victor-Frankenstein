import { spawn } from 'child_process';
import { createAudioResource, StreamType } from '@discordjs/voice';
import { ytdlpCommand, YTDLP_YOUTUBE_ARGS } from './ytdlpYouTube.js';

/**
 * Inicia streaming de áudio via yt-dlp (stdout → Discord voice).
 *
 * @param {string} youtubeUrl
 * @returns {{ resource: import('@discordjs/voice').AudioResource, process: import('child_process').ChildProcess, cleanup: () => void }}
 */
export function createStreamFromYtDlp(youtubeUrl) {
    const args = [
        youtubeUrl,
        ...YTDLP_YOUTUBE_ARGS,
        '-f',
        'bestaudio[ext=m4a]/bestaudio/best/b',
        '--retries',
        '3',
        '--fragment-retries',
        '3',
        '-o',
        '-',
    ];

    const child = spawn(ytdlpCommand(), args, {
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stderr.on('data', (chunk) => {
        const line = chunk.toString().trim();
        if (line && !line.includes('[download]')) {
            console.log(`[YT-DLP-STREAM] ${line}`);
        }
    });

    child.on('error', (error) => {
        console.error(`[YT-DLP-STREAM] Erro no processo: ${error.message}`);
    });

    const cleanup = () => {
        if (child.exitCode === null && !child.killed) {
            child.kill('SIGTERM');
        }
    };

    child.stdout.on('error', (error) => {
        console.error(`[YT-DLP-STREAM] Erro no stdout: ${error.message}`);
        cleanup();
    });

    const resource = createAudioResource(child.stdout, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
    });

    resource.playStream.on('error', (error) => {
        console.error(`[YT-DLP-STREAM] Erro no playStream: ${error.message}`);
        cleanup();
    });

    child.stdout.on('close', cleanup);

    return { resource, process: child, cleanup };
}
