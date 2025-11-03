// src/handlers/eventHandler.js
const fs = require('fs');

function loadEvents(client) {
    const eventFiles = fs.readdirSync('src/events').filter(file => file.endsWith('.js'));

    console.log('\n--- Carregando Eventos ---'); // Log para visualização clara

    for (const file of eventFiles) {
        try {
            // Importa o arquivo de evento
            const event = require(`../events/${file}`);

            // Se o evento tiver 'once: true' (como o 'ready'), usa 'once', senão usa 'on'.
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            
            // ✅ LOG ADICIONADO (ou confirmado)
            console.log(`[EVENT] Carregado com Sucesso: ${event.name}`); 

        } catch (error) {
            console.error(`[EVENT ERROR] Falha ao carregar o evento ${file}:`, error.message);
        }
    }
    console.log('--------------------------');
}

module.exports = { loadEvents };