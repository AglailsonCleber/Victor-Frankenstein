import { env } from '../config/env.js';

/** Flags comuns para contornar mudanças recentes do player do YouTube. */
export const YTDLP_YOUTUBE_ARGS = [
    '--extractor-args',
    'youtube:player_client=android',
    '--no-playlist',
    '--no-update',
];

export function ytdlpCommand() {
    return env.ytdlpCommand();
}
