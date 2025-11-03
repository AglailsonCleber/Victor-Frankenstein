// index.js
require('dotenv').config();
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { loadEvents } = require('./src/handlers/eventHandler');
const { loadCommands } = require('./src/handlers/commandHandler');

// Crie a instância do Client e adicione a Collection para comandos.
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Necessário para o '!ping' (comandos de prefixo)
        // Adicione outras Intents conforme seu bot crescer (ex: GuildMembers)
    ],
});

// Adiciona uma propriedade 'commands' ao cliente, essencial para o handler.
client.commands = new Collection();

// 1. Carrega Eventos
loadEvents(client);

// 2. Carrega Comandos
// Nota: Os comandos de barra (/) são registrados APENAS uma vez, após o evento 'ready'.
loadCommands(client);

// Conecta o bot
client.login(process.env.DISCORD_TOKEN);