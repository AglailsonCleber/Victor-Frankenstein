// src/utils/slashCommandCollector.js

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Coleta todos os comandos de barra da pasta 'src/commands/slash'.
 * O caminho é relativo a 'src/utils'.
 * @returns {Promise<{success: boolean, message?: string, commands?: Array<Object>}>} 
 * Um objeto contendo o status, uma mensagem (em caso de erro) e o array de comandos JSON.
 */
export async function collectCommands() {
    const commands = [];
    // Caminho da pasta 'src/commands/slash' (relativo a 'src/utils')
    const commandsPath = path.join(__dirname, '..', 'commands', 'slash'); 

    try {
        const commandFiles = (await fs.readdir(commandsPath)).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = `file://${path.join(commandsPath, file)}`;
            
            // Importação dinâmica (assíncrona) de comandos ESM
            const command = await import(filePath); 
            
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            } else {
                console.warn(`[WARNING] Comando Slash mal formatado: ${file}`);
            }
        }
        return { success: true, commands: commands };
    } catch (error) {
        // Retorna um erro genérico para ser tratado pelo chamador
        const errorMessage = '❌ Ocorreu um erro ao ler os arquivos de comandos. (Verifique o caminho da pasta slash)';
        console.error('Erro ao ler comandos slash:', error);
        return { success: false, message: errorMessage };
    }
}