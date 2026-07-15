import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { loadEvents } from './src/handlers/eventHandler.js';
import { loadCommands } from './src/handlers/commandHandler.js';
import { env, validateEnv } from './src/config/env.js';

validateEnv();

// Crie a instância do Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// --- CORREÇÃO: Inicialize as DUAS coleções esperadas pelo commandHandler.js ---
client.prefixCommands = new Collection();
client.slashCommands = new Collection();
// -----------------------------------------------------------------------------

// 1. Carrega Eventos
loadEvents(client);

// 2. Carrega Comandos
await loadCommands(client);

// Conecta o bot
client.login(env.discordToken());