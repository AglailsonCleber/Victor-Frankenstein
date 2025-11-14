// index.js

import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { loadEvents } from './src/handlers/eventHandler.js';
import { loadCommands } from './src/handlers/commandHandler.js';

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

client.login(process.env.DISCORD_TOKEN);