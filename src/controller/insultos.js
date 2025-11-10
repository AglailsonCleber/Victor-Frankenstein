// Importa o módulo 'fs/promises' para trabalhar com leitura de arquivos de forma assíncrona (com await)
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Função para carregar o JSON e retornar um insulto aleatório.
 */
export async function obterInsultoAleatorio() {
    // 1. Define o caminho do arquivo JSON.
    // Presume que o arquivo JSON está na mesma pasta do script, chamado 'insultos.json'.
    const jsonPath = path.join(process.cwd(), './database/insultos.json');
    
    console.log(`Tentando ler o arquivo em: ${jsonPath}`);

    try {
        // 2. Lê o arquivo de forma assíncrona. O encoding 'utf8' garante que acentuações funcionem.
        const fileContent = await readFile(jsonPath, { encoding: 'utf8' });
        
        // 3. Converte a string JSON lida em um objeto JavaScript.
        const data = JSON.parse(fileContent);

        // Verifica se a estrutura esperada (data) existe
        if (!data || data.length === 0) {
            return "Erro: Estrutura JSON inválida ou vazia.";
        }

        // 4. Sua lógica de seleção aleatória:
        const insultoObjeto = data[Math.floor(Math.random() * data.length)];
        
        // 5. Extrai o texto da chave 'msg'.
        const insultoTexto = insultoObjeto.msg;

        return insultoTexto;

    } catch (error) {
        // Trata erros como "Arquivo não encontrado" ou "JSON mal formatado"
        console.error("Erro ao processar o arquivo JSON:", error.message);
        return "Erro: Não foi possível obter o insulto (verifique se o arquivo existe e se está correto).";
    }
}
