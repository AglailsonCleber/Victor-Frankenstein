// src/commands/prefix/admin.js (ES Module)

import { 
    REST, 
    Routes, 
    PermissionFlagsBits 
} from 'discord.js';
// Importação do utilitário centralizado (dois níveis acima)
import { collectCommands } from '../../utils/slashCommandCollector.js'; 

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.APPLICATION_ID;


// ====================================================================
// FUNÇÃO 1: DEPLOY (REGISTRAR) COMANDOS NA GUILD ATUAL (RÁPIDO)
// ====================================================================

export async function deployGuildCommands(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Você precisa de permissão de Administrador para usar este comando.');
    }

    // 1. Coleta os comandos de barra (/slash) usando o utilitário
    const collection = await collectCommands();
    if (!collection.success) {
         // Responde ao canal com a mensagem de erro da função utilitária
         return message.reply(collection.message);
    } 
    const commands = collection.commands;

    // 2. Registra na API
    const rest = new REST().setToken(DISCORD_TOKEN);

    try {
        await message.channel.send(`🚀 Iniciando o registro de ${commands.length} comandos de barra (/) no servidor...`);

        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, message.guildId),
            { body: commands },
        );

        await message.channel.send(`✅ Sucesso! ${data.length} comandos de barra (/) registrados no servidor.`);
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
        await message.channel.send('❌ Erro ao comunicar com a API do Discord. Verifique as credenciais no `.env` e se o bot está no servidor.');
    }
}

// ====================================================================
// FUNÇÃO 2: DEPLOY (REGISTRAR) COMANDOS GLOBAIS DO BOT (PRODUÇÃO)
// ====================================================================

export async function deployGlobalCommands(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Você precisa de permissão de Administrador para usar este comando.');
    }
    
    // 1. Coleta os comandos de barra (/slash) usando o utilitário
    const collection = await collectCommands();
    if (!collection.success) {
        // Responde ao canal com a mensagem de erro da função utilitária
        return message.reply(collection.message);
    }
    const commands = collection.commands;

    // 2. Registra na API
    const rest = new REST().setToken(DISCORD_TOKEN);

    try {
        await message.channel.send(`🌍 Iniciando o registro de ${commands.length} comandos de barra (/) GLOBAIS. **Aviso: Isso pode levar até 1 hora para aparecer em todos os servidores!**`);

        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID), // Rota Global para toda a aplicação
            { body: commands },
        );

        await message.channel.send(`✅ Sucesso! ${data.length} comandos Globais registrados.`);
    } catch (error) {
        console.error('❌ Erro ao registrar comandos globais:', error);
        await message.channel.send('❌ Erro ao comunicar com a API do Discord para deploy global. Verifique as credenciais.');
    }
}

// ====================================================================
// FUNÇÃO 3: DELETAR APENAS COMANDOS DO BOT NO SERVIDOR (GUILD)
// ====================================================================

export async function deleteGuildCommands(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Você precisa de permissão de Administrador para usar este comando.');
    }
    
    if (!message.guild) {
        return message.reply('❌ Este comando só pode ser usado em um servidor (Guild).');
    }

    const rest = new REST().setToken(DISCORD_TOKEN);
    const guildId = message.guild.id; 

    try {
        await message.channel.send(`🗑️ Iniciando a exclusão dos comandos de barra (/) do seu bot neste servidor: \`${message.guild.name}\`...`);

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, guildId),
            { body: [] },
        );

        await message.channel.send('✅ Sucesso! Comandos de barra (/) do seu bot foram excluídos deste servidor.');
    } catch (error) {
        console.error('❌ Erro ao deletar comandos do servidor:', error);
        await message.channel.send('❌ Erro ao comunicar com a API do Discord para exclusão.');
    }
}

// ====================================================================
// FUNÇÃO 4: DELETAR APENAS OS COMANDOS GLOBAIS DO BOT (CLIENT)
// ====================================================================

export async function deleteGlobalCommands(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Você precisa de permissão de Administrador para usar este comando.');
    }

    const rest = new REST().setToken(DISCORD_TOKEN);

    try {
        await message.channel.send('🗑️ Iniciando a exclusão dos comandos de barra (/) GLOBAIS do seu bot...');

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: [] },
        );

        await message.channel.send('✅ Sucesso! Comandos Globais do seu bot foram excluídos.');
    } catch (error) {
        console.error('❌ Erro ao deletar comandos globais:', error);
        await message.channel.send('❌ Erro ao comunicar com a API do Discord para exclusão global.');
    }
}

// ====================================================================
// EXPORTAÇÃO (Comando de Prefixo)
// ====================================================================

// Exporta as propriedades principais do comando de prefixo
export const data = {
    name: 'admin',
    description: 'Comandos administrativos para deploy/delete de comandos de barra.',
};

export async function execute(message, args) {
    message.reply({ content: 'Use os comandos de prefixo, como `!deploy-guild-commands` ou `!delete-guild-commands`.', ephemeral: true });
}