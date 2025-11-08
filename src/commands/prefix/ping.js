// src/commands/prefix/ping.js (ES Module)

// Nenhuma importação de discord.js é necessária, pois ele usa apenas message.reply

// 1. Exporta 'data' como uma constante
export const data = {
    name: 'ping',
    description: 'Responde com Pong! (Comando de Prefixo)'
};

// 2. Exporta 'execute' como uma função assíncrona
export async function execute(message, args) {
    // Envia a resposta "Pong!"
    await message.reply('Pong!');

    // Opcional: Você pode incluir a latência (ping) do bot
    // await message.reply(`Pong! (Latência: ${message.client.ws.ping}ms)`);
}