// src/events/ready.js (Corrigido para ESM)
import { Events } from 'discord.js';
// import { deployAndCleanCommands } from '../utils/commandDeployer.js'; // Importe utilitários

export const data = {
    name: Events.ClientReady, 
    once: true,
};

export async function execute(client) {
    console.log(`[STATUS] 🟢 Evento 'ready' recebido. O bot ${client.user.tag} está online e pronto!`);
    
    // Rotina de deploy
    // console.log('[STATUS] Iniciando rotina automática de deploy e limpeza de comandos...');
    // await deployAndCleanCommands(client); // Certifique-se de que deployAndCleanCommands está adaptado para ESM
    console.log('[STATUS] ✅ Rotina de deploy finalizada. Bot pronto para interações!');
}