import fsp from 'fs/promises';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'data', 'playback_state.json');

/**
 * @typedef {Object.<string, {messageId: string}>} PlaybackState
 * Estado da reprodução, mapeando Guild ID para o ID da mensagem de status ativa.
 */

/**
 * Carrega o estado de reprodução persistido no arquivo JSON.
 * Se o arquivo não existir ou estiver vazio, retorna um objeto vazio.
 * @returns {Promise<PlaybackState>} O estado de reprodução.
 */
async function loadState() {
    try {
        const data = await fsp.readFile(STATE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT' || error.name === 'SyntaxError') {
            // Cria a pasta 'data' se não existir
            const dataDir = path.dirname(STATE_FILE);
            try {
                await fsp.mkdir(dataDir, { recursive: true });
            } catch (e) {
                // Ignora se a pasta já existe
            }
            return {}; // Retorna estado vazio se o arquivo não existir ou for inválido
        }
        console.error("❌ Erro ao carregar o estado de reprodução:", error.message);
        return {};
    }
}

/**
 * Salva o estado atual no arquivo JSON.
 * @param {PlaybackState} state O estado de reprodução a ser salvo.
 * @returns {Promise<void>}
 */
async function saveState(state) {
    try {
        await fsp.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
        console.error("❌ Erro ao salvar o estado de reprodução:", error.message);
    }
}

/**
 * Define qual mensagem de interação está ativa para um servidor.
 * @param {string} guildId O ID do servidor.
 * @param {string} messageId O ID da mensagem de status ativa.
 * @returns {Promise<void>}
 */
export async function setActivePlayback(guildId, messageId) {
    const state = await loadState();
    state[guildId] = { messageId };
    await saveState(state);
    console.log(`[STATE] ✅ Novo playback ativo registrado para Guild ${guildId}: ${messageId}`);
}

/**
 * Remove o registro de reprodução ativa para um servidor.
 * @param {string} guildId O ID do servidor.
 * @returns {Promise<void>}
 */
export async function clearActivePlayback(guildId) {
    const state = await loadState();
    if (state[guildId]) {
        delete state[guildId];
        await saveState(state);
        console.log(`[STATE] 🗑️ Playback ativo limpo para Guild ${guildId}.`);
    }
}

/**
 * Obtém o ID da mensagem de status ativa para um servidor.
 * @param {string} guildId O ID do servidor.
 * @returns {Promise<string | null>} O ID da mensagem ou null.
 */
export async function getActivePlayback(guildId) {
    const state = await loadState();
    return state[guildId]?.messageId || null;
}