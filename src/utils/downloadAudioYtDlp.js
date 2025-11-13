import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';

// Diretório de destino para os arquivos baixados (criará a pasta './data')
const DATA_DIR = path.join(process.cwd(), 'data');
// Comando que será executado (presume que 'yt-dlp' está no PATH do sistema)
const YTDL_COMMAND = 'yt-dlp';

// ---------------------------------
// Função de download usando YT-DLP 
// ---------------------------------
/**
 * Salva o áudio do YouTube no disco usando yt-dlp como um processo externo.
 * @param {string} youtubeUrl URL do YouTube.
 * @param {string} filename Nome do arquivo de destino (incluindo extensão .mp3).
 * @returns {Promise<string>} O caminho completo do arquivo salvo.
 */
export async function downloadAudioYtDlp(youtubeUrl, filename) {
  // 1. Cria a pasta /data se ela não existir
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`[YT-DLP] 📁 Criando diretório: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 2. Define o caminho de saída completo
  const outputPathTemplate = path.join(DATA_DIR, filename);

  // 3. Argumentos para o yt-dlp:
  const args = [
    youtubeUrl,
    '--extract-audio',            // -x: extrair apenas o áudio
    '--audio-format', 'mp3',      // --audio-format: converter para MP3
    '--output', outputPathTemplate, // -o: caminho de saída e nome do arquivo
    '--retries', '3',             // Tenta novamente em caso de falha de rede
    '--no-playlist'               // Garante que se for uma playlist, baixe apenas o primeiro
  ];

  console.log(`[YT-DLP] ⚙️ Executando: ${YTDL_COMMAND} ${args.join(' ')}`);

  // 4. Executa o yt-dlp e espera o resultado
  return new Promise((resolve, reject) => {
    // execFile é preferível ao exec por razões de segurança (evita interpretação de shell)
    execFile(YTDL_COMMAND, args, { cwd: DATA_DIR }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[YT-DLP] 💥 ERRO (Code ${error.code}): ${error.message}`);
        console.error(`[YT-DLP] 💥 STDERR: ${stderr}`);
        
        // Erros comuns (como "Não foi possível extrair" ou URL inválida)
        return reject(new Error(`Falha no yt-dlp. Código: ${error.code || 'Desconhecido'}. Mensagem: ${error.message.substring(0, 100)}...`));
      }

      console.log(`[YT-DLP] ✅ Sucesso! Arquivo salvo em: ${outputPathTemplate}`);
      resolve(outputPathTemplate);
    });
  });
}