// index.js (Corrigido para ES Modules e Coleções)

// 1. dotenv - Mude require() para import
import 'dotenv/config';

// 2. discord.js, handlers - Mude require() para import
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { loadEvents } from './src/handlers/eventHandler.js';
import { loadCommands } from './src/handlers/commandHandler.js';

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
client.login(process.env.DISCORD_TOKEN);