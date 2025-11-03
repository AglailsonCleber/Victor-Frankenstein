// src/handlers/commandHandler.js
const fs = require('fs');
const path = require('path');

function loadCommands(client) {
    // Array com as subpastas que contêm comandos
    const commandFolders = ['slash', 'prefix'];
    
    console.log('\n--- Carregando Comandos ---');
    
    for (const folder of commandFolders) {
        const folderPath = path.join(__dirname, '..', 'commands', folder);
        
        // Verifica se a pasta existe antes de tentar ler
        if (!fs.existsSync(folderPath)) {
            console.warn(`[WARNING] A pasta de comandos '${folder}' não foi encontrada em ${folderPath}. Ignorando.`);
            continue;
        }

        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            
            // O comando deve ter as propriedades 'data' (com o nome) e 'execute'
            if ('data' in command && 'execute' in command) {
                const commandName = command.data.name;
                
                // Adiciona o comando à Collection do cliente
                client.commands.set(commandName, command);
                console.log(`[COMMAND] Carregado: ${commandName} [Tipo: ${folder.toUpperCase()}]`);
                
            } else {
                console.warn(`[WARNING] 🟡 O arquivo ${file} na pasta ${folder} está faltando 'data' ou 'execute' e foi ignorado.`);
            }
        }
    }
    
    console.log('--------------------------');
    return client.commands; 
}

module.exports = { loadCommands };