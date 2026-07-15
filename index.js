import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { loadEvents } from './src/handlers/eventHandler.js';
import { loadCommands } from './src/handlers/commandHandler.js';
import { env, validateEnv } from './src/config/env.js';

validateEnv();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

client.prefixCommands = new Collection();
client.slashCommands = new Collection();
client.queueManagers = new Map();

loadEvents(client);
await loadCommands(client);

// Conecta o bot
client.login(env.discordToken());