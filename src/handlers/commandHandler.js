// src/handlers/commandHandler.js (ES Module Corrigido)

import fs from 'fs/promises';
import path from 'path';
// Importa pathToFileURL para converter caminhos locais para URL (necessário para import() dinâmico)
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Carrega todos os comandos de prefixo e slash e os registra no client.
 * @param {import('discord.js').Client} client - O objeto client do bot.
 */
export async function loadCommands(client) {
    const commandsDir = path.join(__dirname, '..', 'commands');

    // --- 1. Carregar Comandos de Prefixo (Prefix) ---
    await loadDirectory(client.prefixCommands, path.join(commandsDir, 'prefix'), 'PREFIX');

    // --- 2. Carregar Comandos de Barra (Slash) ---
    await loadDirectory(client.slashCommands, path.join(commandsDir, 'slash'), 'SLASH');
}

/**
 * Função utilitária para ler um diretório e carregar os comandos.
 * @param {Map} commandCollection - A coleção (Map) onde os comandos serão armazenados.
 * @param {string} directoryPath - O caminho para o diretório de comandos.
 * @param {string} type - O tipo de comando (PREFIX ou SLASH) para logs.
 */
async function loadDirectory(commandCollection, directoryPath, type) {
    try {
        const commandFiles = (await fs.readdir(directoryPath)).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(directoryPath, file);
            
            // CORREÇÃO ESSENCIAL: Converte o caminho do sistema de arquivos para URL
            // O import() dinâmico em ESM exige o formato URL (file://...)
            const fileUrl = pathToFileURL(filePath).href;

            try {
                // Importação dinâmica (assíncrona)
                const command = await import(fileUrl);
                
                // Os comandos ESM usam 'export const data' e 'export async function execute'
                if ('data' in command && 'execute' in command) {
                    commandCollection.set(command.data.name, command);
                    console.log(`[COMMAND] Carregado com Sucesso [${type}]: ${command.data.name}`);
                } else {
                    console.warn(`[WARNING] Comando ${file} mal formatado (faltando 'data' ou 'execute').`);
                }
            } catch (error) {
                console.error(`[COMMAND ERROR] Falha ao carregar o comando ${file}: ${error.message}`);
            }
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`[WARNING] Diretório de comandos ${type} não encontrado: ${directoryPath}`);
        } else {
            console.error(`[COMMAND ERROR] Erro ao processar diretório ${type}: ${error.message}`);
        }
    }
}