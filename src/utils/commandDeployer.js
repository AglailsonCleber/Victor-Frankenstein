// src/utils/commandDeployer.js
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.APPLICATION_ID;
const GUILD_ID = process.env.SERVER_ID;

const rest = new REST().setToken(TOKEN);

// Rota de Guilda (para desenvolvimento rápido)
const GUILD_COMMANDS_ROUTE = Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);

/**
 * Coleta os dados dos comandos de barra da pasta 'slash'.
 * @returns {Array} Array de objetos JSON dos comandos.
 */
function collectSlashCommands() {
    const commands = [];
    // Assumindo que este utilitário está em src/utils, o caminho é: ../commands/slash
    const commandsPath = path.join(__dirname, '..', 'commands', 'slash');

    try {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(path.join(commandsPath, file));
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
async function deployAndCleanCommands(client) {
    const commandData = collectSlashCommands();

    console.log(`[DEPLOY] Iniciando rotina de deploy no servidor ID: ${GUILD_ID}`);

    // --- PASSO 1: DELETAR (LIMPEZA) ---
    try {
        console.log(`[DEPLOY] Tentando limpar ${client.user.tag}'s comandos antigos...`);
        // Envia um array vazio para a rota GUILD para deletar TUDO que o bot registrou lá.
        await rest.put(
            GUILD_COMMANDS_ROUTE,
            { body: [] },
        );
        console.log('[DEPLOY] ✅ Limpeza dos comandos antigos concluída com sucesso.');

    } catch (error) {
        console.error('[DEPLOY ERROR] ❌ Falha ao limpar comandos antigos:', error);
        // Não é um erro fatal, podemos prosseguir com o deploy.
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

module.exports = { deployAndCleanCommands };