// src/utils/fileCleanup.js

import fsp from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Deleta um arquivo local do diretório /data.
 * @param {string} filename O nome base do arquivo (ex: 'Artista - Titulo.mp3').
 */
export async function deleteLocalFile(filename) {
    if (!filename) return;
    const filePath = path.join(DATA_DIR, filename);
    
    try {
        await fsp.unlink(filePath);
        console.log(`[CLEANUP] 🗑️ Arquivo deletado com sucesso: ${filename}`);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`[CLEANUP] ⚠️ Arquivo não encontrado (já deletado ou caminho incorreto): ${filename}`);
            return false;
        }
        console.error(`[CLEANUP] ❌ Erro ao deletar arquivo ${filename}: ${error.message}`);
        return false;
    }
}