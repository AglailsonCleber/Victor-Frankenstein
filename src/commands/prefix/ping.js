// src/commands/ping.js

module.exports = {
    // A propriedade 'data' é o que o handler procura para registrar o nome
    data: { 
        name: 'ping', 
        description: 'Responde com Pong! (Comando de Prefixo)' 
    },

    // A função 'execute' aqui pode ficar vazia, pois a lógica de resposta
    // para comandos de prefixo está toda no messageCreate.js. 
    // Mas ela é necessária para que o handler não reclame da falta de 'execute'.
    async execute(message, args) {
        // A lógica de resposta será executada no messageCreate

        // Envia a resposta "Pong!"
        await message.reply('Pong!');
        
        // Opcional: Você pode incluir a latência (ping) do bot
        // await message.reply(`Pong! (Latência: ${message.client.ws.ping}ms)`);
    },
};