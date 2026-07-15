// src/utils/slashCommandCollector.js

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __filename e __dirname para compatibilidade em ES Modules
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
    // Ex: src/utils -> src/commands/slash
    const commandsPath = path.join(__dirname, '..', 'commands', 'slash'); 

    try {
        // 1. Lê todos os ficheiros .js dentro da pasta 'slash'
        const commandFiles = (await fs.readdir(commandsPath)).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            // 2. Converte o caminho para URL (necessário para import() dinâmico em ESM)
            const filePath = `file://${path.join(commandsPath, file)}`;
            
            // 3. Importação dinâmica (assíncrona) do módulo
            const command = await import(filePath); 
            
            // 4. Verifica se o módulo possui as propriedades 'data' e 'execute'
            if ('data' in command && 'execute' in command) {
                // 5. Converte o objeto SlashCommandBuilder ('data') para o formato JSON exigido pela API do Discord
                commands.push(command.data.toJSON());
            } else {
                console.warn(`[WARNING] Comando Slash mal formatado: ${file}`);
            }
        }
        
        // 6. Retorna o array de comandos JSON
        return { success: true, commands: commands };
    } catch (error) {
        // Trata erros de ficheiro ou pasta ausente
        const errorMessage = '❌ Ocorreu um erro ao ler os arquivos de comandos. (Verifique o caminho da pasta slash)';
        console.error('Erro ao ler comandos slash:', error);
        return { success: false, message: errorMessage };
    }
}