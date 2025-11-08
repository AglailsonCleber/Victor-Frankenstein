// src/handlers/eventHandler.js (ES Module com Debugging)

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Carrega todos os eventos de subdiretórios e os registra no client.
 * @param {import('discord.js').Client} client - O objeto client do bot.
 */
export async function loadEvents(client) {
    console.log('\n--- Carregando Eventos ---');
    
    // Caminho para a pasta 'events' (um nível acima de 'handlers')
    const eventsDir = path.join(__dirname, '..', 'events');

    try {
        const eventFiles = (await fs.readdir(eventsDir)).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(eventsDir, file);
            // Converte o caminho do sistema de arquivos para URL (necessário para import() dinâmico)
            const fileUrl = pathToFileURL(filePath).href;

            try {
                // Importação dinâmica (assíncrona)
                const event = await import(fileUrl);

                // Eventos ESM devem ter 'export const data' e 'export async function execute'
                if ('data' in event && 'execute' in event) {
                    const eventName = event.data.name;
                    const isOnce = event.data.once;
                    
                    if (typeof eventName === 'undefined') {
                        console.error(`[EVENT ERROR] ❌ Evento ${file} carregado, mas 'data.name' está UNDEFINED. Objeto 'data':`, event.data);
                        continue; // Pula para o próximo arquivo
                    }

                    if (isOnce) {
                        client.once(eventName, (...args) => event.execute(client, ...args));
                    } else {
                        // Assumindo que a função execute em eventos tem a assinatura correta
                        client.on(eventName, (...args) => event.execute(...args));
                    }

                    console.log(`[EVENT] ✅ Carregado com Sucesso: ${eventName}`);
                } else {
                    console.warn(`[EVENT WARNING] ⚠️ Arquivo ${file} ignorado (Falta 'data' ou 'execute').`);
                }

            } catch (error) {
                console.error(`[EVENT ERROR] ❌ Falha ao importar ${file}: ${error.message}`);
            }
        }
    } catch (error) {
        console.error('[EVENT ERROR] ❌ Falha ao ler o diretório de eventos:', error);
    }
    console.log('--------------------------');
}