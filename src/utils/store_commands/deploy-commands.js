// deploy-commands.js
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// 🔑 Seus IDs de configuração
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.APPLICATION_ID;
const GUILD_ID = process.env.SERVER_ID;

const commands = [];
// Lê todos os arquivos de comando da pasta /src/commands
const commandsPath = path.join(__dirname, 'src', 'commands', 'slash');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
        // Envia apenas o dado JSON para a API.
        commands.push(command.data.toJSON());
    } else {
        console.log(`[WARNING] O comando em ${file} está faltando 'data' ou 'execute'.`);
    }
}

// Constrói a instância REST
const rest = new REST().setToken(TOKEN);

// Função assíncrona para registrar os comandos
(async () => {
    try {
        console.log(`🚀 Iniciando o registro de ${commands.length} comandos de barra (/).`);

        // Usa a rota de GUILD para atualização instantânea (troque para Routes.applicationCommands se for global)
        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log(`✅ Sucesso! ${data.length} comandos de barra (/) registrados no servidor.`);
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
})();