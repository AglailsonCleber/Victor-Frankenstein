// src/events/ready.js (Corrigido para ESM)

import { Events } from 'discord.js';
import { deployGuildCommands, deployGlobalCommands, deleteGuildCommands, deleteGlobalCommands } from '../utils/commandDeployer.js';

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
    
    // As linhas abaixo estão comentadas (//), o que significa que o deploy é manual
    // e não automático ao iniciar.
    
    // await deleteGuildCommands(client);
    // await deployGuildCommands(client);
    // await deleteGlobalCommands(client);
    // await deployGlobalCommands(client);
    
    console.log('[STATUS] ✅ Rotina de deploy finalizada. Bot pronto para interações!');
}