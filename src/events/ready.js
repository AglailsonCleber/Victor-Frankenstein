// src/events/ready.js (Corrigido para ESM)

import { Events } from 'discord.js';
import { deployGuildCommands, deployGlobalCommands, deleteGuildCommands, deleteGlobalCommands } from '../utils/commandDeployer.js';

export const data = {
    name: Events.ClientReady, 
    once: true,
};

export async function execute(client) {
    console.log(`[STATUS] 🟢 Evento 'ready' recebido. O bot ${client.user.tag} está online e pronto!`);
    await deleteGuildCommands(client);
    await deployGuildCommands(client);
    // await deleteGlobalCommands(client);
    // await deployGlobalCommands(client);
    console.log('[STATUS] ✅ Rotina de deploy finalizada. Bot pronto para interações!');
}