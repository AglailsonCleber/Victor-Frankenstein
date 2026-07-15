import 'dotenv/config';

const REQUIRED_SECRETS = [
    'DISCORD_TOKEN',
    'APPLICATION_ID',
    'TMDB_BEARER_TOKEN',
    'GOOGLE_API_KEY',
];

const OPTIONAL_WITH_DEFAULTS = {
    SERVER_ID: '',
    GEMINI_MODEL_NAME: 'gemini-2.5-flash',
    GEMINI_SYSTEM_INSTRUCTION:
        'Você é um assistente inteligente e revoltado com seu criador e com quem te faz perguntas. Conhecido como: Monstro, Demônio, Frankenstein e FrankBot. Responde sempre com ironia e em português.',
    DEPLOY_MODE: 'guild',
    COMMAND_PREFIX: '!',
    DATA_DIR: 'data',
    TMDB_LANGUAGE: 'pt-BR',
    TMDB_WATCH_REGION: 'BR',
    NODE_ENV: 'production',
    YTDLP_COMMAND: 'yt-dlp',
};

function getEnv(name, defaultValue) {
    const value = process.env[name];
    if (value === undefined || value === '') {
        return defaultValue;
    }
    return value;
}

function validateDeployMode(mode) {
    const allowed = ['none', 'guild', 'global', 'guild-then-global'];
    if (!allowed.includes(mode)) {
        throw new Error(
            `DEPLOY_MODE inválido: "${mode}". Valores permitidos: ${allowed.join(', ')}`
        );
    }
    return mode;
}

export function validateEnv() {
    const missing = REQUIRED_SECRETS.filter(
        (key) => !process.env[key] || process.env[key].trim() === ''
    );

    if (missing.length > 0) {
        throw new Error(
            `Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`
        );
    }

    const deployMode = validateDeployMode(
        getEnv('DEPLOY_MODE', OPTIONAL_WITH_DEFAULTS.DEPLOY_MODE)
    );

    if (
        (deployMode === 'guild' || deployMode === 'guild-then-global') &&
        !getEnv('SERVER_ID', '')
    ) {
        throw new Error(
            'SERVER_ID é obrigatório quando DEPLOY_MODE=guild ou guild-then-global'
        );
    }

    return true;
}

export const env = {
    discordToken: () => process.env.DISCORD_TOKEN,
    applicationId: () => process.env.APPLICATION_ID,
    serverId: () => getEnv('SERVER_ID', OPTIONAL_WITH_DEFAULTS.SERVER_ID),
    tmdbBearerToken: () => process.env.TMDB_BEARER_TOKEN,
    tmdbLanguage: () => getEnv('TMDB_LANGUAGE', OPTIONAL_WITH_DEFAULTS.TMDB_LANGUAGE),
    tmdbWatchRegion: () => getEnv('TMDB_WATCH_REGION', OPTIONAL_WITH_DEFAULTS.TMDB_WATCH_REGION),
    googleApiKey: () => process.env.GOOGLE_API_KEY,
    geminiModelName: () => getEnv('GEMINI_MODEL_NAME', OPTIONAL_WITH_DEFAULTS.GEMINI_MODEL_NAME),
    geminiSystemInstruction: () =>
        getEnv('GEMINI_SYSTEM_INSTRUCTION', OPTIONAL_WITH_DEFAULTS.GEMINI_SYSTEM_INSTRUCTION),
    deployMode: () => validateDeployMode(getEnv('DEPLOY_MODE', OPTIONAL_WITH_DEFAULTS.DEPLOY_MODE)),
    commandPrefix: () => getEnv('COMMAND_PREFIX', OPTIONAL_WITH_DEFAULTS.COMMAND_PREFIX),
    dataDir: () => getEnv('DATA_DIR', OPTIONAL_WITH_DEFAULTS.DATA_DIR),
    nodeEnv: () => getEnv('NODE_ENV', OPTIONAL_WITH_DEFAULTS.NODE_ENV),
    logLevel: () => getEnv('LOG_LEVEL', OPTIONAL_WITH_DEFAULTS.LOG_LEVEL),
    ytdlpCommand: () => getEnv('YTDLP_COMMAND', OPTIONAL_WITH_DEFAULTS.YTDLP_COMMAND),
    isProduction: () => getEnv('NODE_ENV', OPTIONAL_WITH_DEFAULTS.NODE_ENV) === 'production',
};
