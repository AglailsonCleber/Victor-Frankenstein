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
        console.log(`🚀 Iniciando o registro de ${commands.length} comandos (GUILD) na Guilda ${SERVER_ID}...`);

        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, SERVER_ID),
            { body: commands },
        );

        return { success: true, message: `✅ Sucesso! ${data.length} comandos de barra (/) registrados no servidor de teste.` };
    } catch (error) {
        console.error('❌ Erro ao registrar comandos na Guilda:', error);
        return { success: false, message: '❌ Erro ao comunicar com a API do Discord para Guild Deploy.' };
    }
}

// ====================================================================
// FUNÇÃO 2: DEPLOY DE COMANDOS GLOBAIS (PRODUÇÃO)
// ====================================================================

/**
 * 2. Coleta e registra os comandos de barra (/) globalmente (em todos os servidores).
 * @param {import('discord.js').Client} client O cliente Discord.js.
 * @returns {Promise<{success: boolean, message: string}>} O resultado da operação.
 */
export async function deployGlobalCommands(client) {
    // AQUI: Usa a função importada para coletar comandos
    const collection = await collectCommands();
    if (!collection.success) return { success: false, message: collection.message };
    const commands = collection.commands;

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        console.log(`🌍 Iniciando o registro de ${commands.length} comandos (GLOBAL)... (Pode levar até 1 hora para propagar)`);

        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        return { success: true, message: `✅ Sucesso! ${data.length} comandos Globais registrados. (Propagação pode levar até 1h)` };
    } catch (error) {
        console.error('❌ Erro ao registrar comandos Globais:', error);
        return { success: false, message: '❌ Erro ao comunicar com a API do Discord para Global Deploy.' };
    }
}


// ====================================================================
// FUNÇÃO 3: DELETAR COMANDOS DA GUILDA
// ====================================================================

/**
 * 3. Deleta todos os comandos de barra (/) do bot registrados na Guilda de Teste (SERVER_ID).
 * @param {import('discord.js').Client} client O cliente Discord.js.
 * @returns {Promise<{success: boolean, message: string}>} O resultado da operação.
 */
export async function deleteGuildCommands(client) {
    if (!SERVER_ID) {
        return { success: false, message: '❌ Variável SERVER_ID não definida no ambiente para exclusão de Guilda.' };
    }
    
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        console.log(`🗑️ Iniciando a exclusão dos comandos de barra (/) do bot na Guilda ${SERVER_ID}...`);

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, SERVER_ID),
            { body: [] }, // Envia um array vazio para deletar todos os comandos da Guilda
        );

        return { success: true, message: '✅ Sucesso! Comandos de barra (/) do bot foram excluídos do servidor de teste.' };
    } catch (error) {
        console.error('❌ Erro ao deletar comandos do servidor:', error);
        return { success: false, message: '❌ Erro ao comunicar com a API do Discord para exclusão de Guilda.' };
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