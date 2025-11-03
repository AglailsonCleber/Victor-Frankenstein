// src/events/ready.js
const { deployAndCleanCommands } = require('../utils/commandDeployer');

module.exports = {
    name: 'ready',
    once: true,
    // ESTA É A MUDANÇA MAIS IMPORTANTE: USAR 'async'
    async execute(client) {
        console.log(`[STATUS] 🟢 Evento 'ready' recebido. O bot ${client.user.tag} está online e pronto!`);

        console.log('[STATUS] Iniciando rotina automática de deploy e limpeza de comandos...');

        // ESTA É A SEGUNDA MUDANÇA MAIS IMPORTANTE: USAR 'await'
        // await deployAndCleanCommands(client);

        console.log('[STATUS] ✅ Rotina de deploy finalizada. Bot pronto para interações!');
        // Qualquer outra lógica de "bot pronto" deve vir APÓS o await.
    },
};