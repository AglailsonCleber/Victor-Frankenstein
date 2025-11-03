// src/events/ready.js
module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        // Log para quando o evento 'ready' é recebido e o bot está online
        console.log(`[STATUS] 🟢 Evento 'ready' recebido. O bot ${client.user.tag} está online e pronto!`);
        
        // Coloque aqui o código para registrar comandos de barra (/), se necessário.
    },
};