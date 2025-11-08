// src/commands/prefix/admin.js (ES Module)

import { 
    REST, 
    Routes, 
    PermissionFlagsBits 
} from 'discord.js';
import fs from 'fs/promises'; 
import path from 'path'; 
import { fileURLToPath } from 'url';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.APPLICATION_ID;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ====================================================================
// FUNÇÃO UTILIÁRIA INTERNA: Coletar Comandos Slash
// ====================================================================

/**
 * Coleta todos os comandos de barra da pasta 'slash'.
 * @param {import('discord.js').Message} message A mensagem de onde o comando foi invocado (para responder em caso de erro).
 * @returns {Promise<{success: boolean, commands?: Array<Object>}>} O array de comandos JSON ou um objeto de erro.
 */
async function collectSlashCommands(message) {
    const commands = [];
    // O caminho é ajustado para ser relativo à pasta 'slash' (um nível acima de 'prefix')
    const commandsPath = path.join(__dirname, '..', 'slash'); 

    try {
        const commandFiles = (await fs.readdir(commandsPath)).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            // Caminho completo do arquivo no formato URL para import()
            const filePath = `file://${path.join(commandsPath, file)}`;
            
            // Importação dinâmica (assíncrona) de comandos ESM
            const command = await import(filePath); 
            
            // Comandos ESM usam exportações nomeadas 'data' e 'execute'
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            } else {
                console.warn(`[WARNING] Comando Slash mal formatado: ${file}`);
            }
        }
        return { success: true, commands };
    } catch (error) {
        console.error('Erro ao ler comandos slash para deploy:', error);
        await message.reply('❌ Ocorreu um erro ao ler os arquivos de comandos. (Verifique o caminho da pasta slash)');
        return { success: false };
    }
}


// ====================================================================
// FUNÇÃO 1: DEPLOY (REGISTRAR) COMANDOS NA GUILD ATUAL (RÁPIDO)
// ====================================================================

export async function deployGuildCommands(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Você precisa de permissão de Administrador para usar este comando.');
    }

    // 1. Coleta os comandos de barra (/slash)
    const collection = await collectSlashCommands(message);
    if (!collection.success) return; // Erro já tratado e respondido na utilitária
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
    
    // 1. Coleta os comandos de barra (/slash)
    const collection = await collectSlashCommands(message);
    if (!collection.success) return; // Erro já tratado e respondido na utilitária
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
    // Nota: Esta função executa quando o comando de prefixo é chamado sem argumentos.
    message.reply({ content: 'Use os comandos de prefixo, como `!deploy-guild-commands` ou `!delete-guild-commands`.', ephemeral: true });
}