// src/utils/commandDeployer.js (ES Module com Importação Dinâmica)

import { REST, Routes } from 'discord.js';
import fs from 'fs/promises'; // Usaremos a versão assíncrona para melhor compatibilidade com import()
import path from 'path';
import { fileURLToPath } from 'url';

// Para obter o __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.APPLICATION_ID;
// const GUILD_ID = process.env.SERVER_ID;

const rest = new REST().setToken(TOKEN);

// Rota de Guilda (para desenvolvimento rápido)
const GUILD_COMMANDS_ROUTE = Routes.applicationGuildCommands(CLIENT_ID, client.guilds.cache.first()?.id || ''); // Usa o primeiro guilda do cache

/**
 * Coleta os dados dos comandos de barra da pasta 'slash' usando import() dinâmico.
 * @returns {Promise<Array>} Promessa de Array de objetos JSON dos comandos.
 */
async function collectSlashCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, '..', 'commands', 'slash');

    try {
        // Usamos fs/promises.readdir para esperar pelos nomes dos arquivos
        const commandFiles = (await fs.readdir(commandsPath)).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            // Caminho completo do arquivo no formato URL para import()
            const filePath = `file://${path.join(commandsPath, file)}`;
            
            // Importação dinâmica (é assíncrona!)
            const command = await import(filePath); 
            
            // Os comandos em ESM usam 'export const data' e 'export async function execute'
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            }
        }
    } catch (error) {
        console.error('Erro ao ler comandos slash para deploy:', error);
    }
    return commands;
}

/**
 * 1. Limpa (deleta) os comandos slash do bot no servidor.
 * 2. Registra os novos comandos.
 * @param {import('discord.js').Client} client - O objeto client do bot.
 */
export async function deployAndCleanCommands(client) {
    // Agora collectSlashCommands é assíncrona e precisa de await
    const commandData = await collectSlashCommands(); 

    console.log(`[DEPLOY] Iniciando rotina de deploy no servidor ID: ${client.guilds.cache.first()?.id || 'Desconhecido'}`);

    // --- PASSO 1: DELETAR (LIMPEZA) ---
    try {
        console.log(`[DEPLOY] Tentando limpar ${client.user.tag}'s comandos antigos...`);
        await rest.put(
            GUILD_COMMANDS_ROUTE,
            { body: [] },
        );
        console.log('[DEPLOY] ✅ Limpeza dos comandos antigos concluída com sucesso.');

    } catch (error) {
        console.error('[DEPLOY ERROR] ❌ Falha ao limpar comandos antigos:', error);
    }

    // --- PASSO 2: DEPLOY (REGISTRO) ---
    if (commandData.length === 0) {
        console.log('[DEPLOY] Nenhum comando de barra (/slash) encontrado para registrar.');
        return;
    }

    try {
        console.log(`[DEPLOY] Tentando registrar ${commandData.length} novos comandos...`);
        const data = await rest.put(
            GUILD_COMMANDS_ROUTE,
            { body: commandData },
        );
        console.log(`[DEPLOY] ✅ Registro de ${data.length} comandos concluído com sucesso.`);
    } catch (error) {
        console.error('[DEPLOY ERROR] ❌ Falha ao registrar novos comandos:', error);
    }
}