import { Events } from 'discord.js';
import { deployGuildCommands, deployGlobalCommands, deleteGuildCommands, deleteGlobalCommands } from '../utils/commandDeployer.js';
import { env } from '../config/env.js';

// --- 1. Exportação de Metadados ---
export const data = {
    // Liga este ficheiro ao evento 'ClientReady' (quando o bot está online)
    name: Events.ClientReady, 
    // Garante que o evento é executado apenas UMA VEZ no início
    once: true,
};

// --- 2. Função de Execução do Evento ---
export async function execute(client) {
    console.log(`[STATUS] 🟢 Evento 'ready' recebido. O bot ${client.user.tag} está online e pronto!`);

    const deployMode = env.deployMode();

    if (deployMode === 'none') {
        console.log('[STATUS] DEPLOY_MODE=none — deploy automático ignorado.');
        return;
    }

    if (deployMode === 'guild' || deployMode === 'guild-then-global') {
        await deleteGuildCommands(client);
        const guildResult = await deployGuildCommands(client);
        console.log(`[STATUS] Deploy guild: ${guildResult.message}`);
    }

    if (deployMode === 'global' || deployMode === 'guild-then-global') {
        await deleteGlobalCommands(client);
        const globalResult = await deployGlobalCommands(client);
        console.log(`[STATUS] Deploy global: ${globalResult.message}`);
    }

    console.log('[STATUS] ✅ Rotina de deploy finalizada. Bot pronto para interações!');
}