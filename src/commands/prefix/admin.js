// src/commands/prefix/admin.js
const { REST, Routes, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.APPLICATION_ID;
const GUILD_ID = process.env.SERVER_ID;

// ====================================================================
// FUNÇÃO 1: DEPLOY (REGISTRAR) COMANDOS
// ====================================================================

async function deployCommands(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Você precisa de permissão de Administrador para usar este comando.');
    }

    // 1. Coleta os comandos de barra (/slash)
    const commands = [];
    const commandsPath = path.join(__dirname, '..', 'slash');

    try {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(path.join(commandsPath, file));
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            } else {
                console.warn(`[WARNING] Comando Slash mal formatado: ${file}`);
            }
        }
    } catch (error) {
        console.error('Erro ao ler comandos slash para deploy:', error);
        return message.reply('❌ Ocorreu um erro ao ler os arquivos de comandos. (Verifique o caminho da pasta slash)');
    }

    // 2. Registra na API
    const rest = new REST().setToken(TOKEN);

    try {
        await message.channel.send(`🚀 Iniciando o registro de ${commands.length} comandos de barra (/) no servidor...`);

        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        await message.channel.send(`✅ Sucesso! ${data.length} comandos de barra (/) registrados no servidor.`);
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
        await message.channel.send('❌ Erro ao comunicar com a API do Discord. Verifique as credenciais no `.env` e se o bot está no servidor.');
    }
}

// ====================================================================
// FUNÇÃO 2: DELETAR APENAS COMANDOS DO BOT NO SERVIDOR (GUILD)
// ====================================================================

async function deleteMyGuildCommands(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Você precisa de permissão de Administrador para usar este comando.');
    }

    const rest = new REST().setToken(TOKEN);

    try {
        await message.channel.send('🗑️ Iniciando a exclusão dos comandos de barra (/) do seu bot neste servidor...');

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: [] },
        );

        await message.channel.send('✅ Sucesso! Comandos de barra (/) do seu bot foram excluídos deste servidor.');
    } catch (error) {
        console.error('❌ Erro ao deletar comandos do servidor:', error);
        await message.channel.send('❌ Erro ao comunicar com a API do Discord para exclusão.');
    }
}

// ====================================================================
// FUNÇÃO 3: DELETAR APENAS OS COMANDOS GLOBAIS DO BOT (CLIENT)
// ====================================================================

async function deleteMyGlobalCommands(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Você precisa de permissão de Administrador para usar este comando.');
    }

    const rest = new REST().setToken(TOKEN);

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
// EXPORTAÇÃO
// ====================================================================

module.exports = {
    data: {
        name: 'admin',
        description: 'Comandos administrativos para deploy/delete de comandos de barra.',
    },

    async execute(message, args) {
        message.reply({ content: 'Use os comandos de prefixo, como `!deploy-commands` ou `!delete-my-guild`.', ephemeral: true });
    },

    deployCommands,
    deleteMyGuildCommands,
    deleteMyGlobalCommands
};