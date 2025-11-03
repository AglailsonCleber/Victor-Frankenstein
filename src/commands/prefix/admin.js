// src/commands/prefix/admin.js (CORRIGIDO)
const { REST, Routes, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.APPLICATION_ID;
const GUILD_ID = process.env.SERVER_ID;

// Funções deployCommands e deleteCommands permanecem as mesmas
// ... (código das funções deployCommands e deleteCommands) ...

async function deployCommands(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Você precisa de permissão de Administrador para usar este comando.');
    }
    
    // 1. Coleta os comandos de barra (/slash)
    const commands = [];
    // ATENÇÃO: Verifique se este caminho está correto no seu projeto. 
    // Deveria ser '..', 'slash' se estiver dentro de 'src/commands/prefix'
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
        await message.channel.send('❌ Erro ao comunicar com a API do Discord. Verifique as credenciais no `.env`.');
    }
}

async function deleteCommands(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Você precisa de permissão de Administrador para usar este comando.');
    }
    
    const rest = new REST().setToken(TOKEN);

    try {
        await message.channel.send('🗑️ Iniciando a exclusão de todos os comandos de barra (/) deste servidor...');
        
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: [] },
        );

        await message.channel.send('✅ Sucesso! Todos os comandos de barra (/) foram excluídos deste servidor.');
    } catch (error) {
        console.error('❌ Erro ao deletar comandos:', error);
        await message.channel.send('❌ Erro ao comunicar com a API do Discord para exclusão.');
    }
}

module.exports = {
    data: {
        name: 'admin',
        description: 'Comandos administrativos para deploy/delete de comandos de barra.',
    },
    
    // <--- ADICIONE ESTA FUNÇÃO VAZIA AQUI PARA PASSAR NA VERIFICAÇÃO DO HANDLER
    async execute(message, args) { 
        // Esta função não faz nada, pois a lógica de !deploy-commands e !delete-commands
        // é tratada diretamente no messageCreate.js
    }, 
    // -------------------------------------------------------------------------
    
    // Exportamos as funções que serão chamadas no messageCreate.js
    deployCommands,
    deleteCommands
};