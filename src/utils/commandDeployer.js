// src/utils/commandDeployer.js (ES Module)

import { 
    REST, 
    Routes,
} from 'discord.js';
import { collectCommands } from './slashCommandCollector.js'; 

// Variáveis de ambiente
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.APPLICATION_ID;
const SERVER_ID = process.env.SERVER_ID; 

// ====================================================================
// FUNÇÃO 1: DEPLOY DE COMANDOS NA GUILDA (RÁPIDO)
// ====================================================================

/**
 * 1. Coleta e registra os comandos de barra (/) na Guilda de Teste definida em SERVER_ID.
 * @param {import('discord.js').Client} client O cliente Discord.js.
 * @returns {Promise<{success: boolean, message: string}>} O resultado da operação.
 */
export async function deployGuildCommands(client) {
    if (!SERVER_ID) {
        return { success: false, message: '❌ Variável SERVER_ID não definida no ambiente para deploy de Guilda.' };
    }

    // AQUI: Usa a função importada para coletar comandos
    const collection = await collectCommands();
    if (!collection.success) return { success: false, message: collection.message };
    const commands = collection.commands;

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        console.log(`🚀 Iniciando o registro de ${commands.length} comandos de barra (/) na Guilda: ${SERVER_ID}`);

        // Rota de registro de comandos de guilda
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, SERVER_ID),
            { body: commands },
        );

        return { success: true, message: `✅ Sucesso! ${commands.length} comandos de barra (/) registrados no servidor de teste.` };
    } catch (error) {
        console.error('❌ Erro ao registrar comandos do servidor:', error);
        return { success: false, message: `❌ Erro ao comunicar com a API do Discord para deploy de Guilda: ${error.message}` };
    }
}


// ====================================================================
// FUNÇÃO 2: DELETAR COMANDOS DA GUILDA
// ====================================================================

/**
 * 2. Deleta todos os comandos de barra (/) da Guilda de Teste definida em SERVER_ID.
 * @param {import('discord.js').Client} client O cliente Discord.js.
 * @returns {Promise<{success: boolean, message: string}>} O resultado da operação.
 */
export async function deleteGuildCommands(client) {
    if (!SERVER_ID) {
        return { success: false, message: '❌ Variável SERVER_ID não definida no ambiente para deletar comandos de Guilda.' };
    }
    
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        console.log('🗑️ Iniciando a exclusão dos comandos de barra (/) da Guilda de teste...');

        // Rota de exclusão (envia um array vazio)
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, SERVER_ID),
            { body: [] },
        );

        return { success: true, message: '✅ Sucesso! Comandos de barra (/) do bot foram excluídos do servidor de teste.' };
    } catch (error) {
        console.error('❌ Erro ao deletar comandos do servidor:', error);
        return { success: false, message: '❌ Erro ao comunicar com a API do Discord para exclusão de Guilda.' };
    }
}


// ====================================================================
// FUNÇÃO 3: DEPLOY DE COMANDOS GLOBAIS (LENTO)
// ====================================================================

/**
 * 3. Coleta e registra os comandos de barra (/) globalmente (aplicação).
 * A propagação global pode levar até 1 hora.
 * @param {import('discord.js').Client} client O cliente Discord.js.
 * @returns {Promise<{success: boolean, message: string}>} O resultado da operação.
 */
export async function deployGlobalCommands(client) {
    const collection = await collectCommands();
    if (!collection.success) return { success: false, message: collection.message };
    const commands = collection.commands;

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        console.log(`🌐 Iniciando o registro de ${commands.length} comandos de barra (/) GLOBAIS...`);

        // Rota de registro de comandos globais
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        return { success: true, message: `✅ Sucesso! ${commands.length} comandos de barra (/) GLOBAIS registrados. (Atenção: A propagação pode levar até 1 hora)` };
    } catch (error) {
        console.error('❌ Erro ao registrar comandos globais:', error);
        return { success: false, message: `❌ Erro ao comunicar com a API do Discord para deploy Global: ${error.message}` };
    }
}

// ====================================================================
// FUNÇÃO 4: DELETAR COMANDOS GLOBAIS
// ====================================================================

/**
 * 4. Deleta todos os comandos de barra (/) globais (aplicação) do bot.
 * @param {import('discord.js').Client} client O cliente Discord.js.
 * @returns {Promise<{success: boolean, message: string}>} O resultado da operação.
 */
export async function deleteGlobalCommands(client) {
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        console.log('🗑️ Iniciando a exclusão dos comandos de barra (/) GLOBAIS do bot...');

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: [] }, // Envia um array vazio para deletar todos os comandos globais
        );

        return { success: true, message: '✅ Sucesso! Comandos Globais do bot foram excluídos.' };
    } catch (error) {
        console.error('❌ Erro ao deletar comandos globais:', error);
        return { success: false, message: '❌ Erro ao comunicar com a API do Discord para exclusão global.' };
    }
}