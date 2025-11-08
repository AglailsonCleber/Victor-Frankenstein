import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';

// Diretório de destino para os arquivos baixados
const DATA_DIR = path.join(process.cwd(), 'data');
// Comando que será executado (mude para 'youtube-dl' se preferir)
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
  // Cria a pasta /data se ela não existir
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // O yt-dlp baixa o arquivo e o renomeia, então definimos o template de saída.
  const outputPathTemplate = path.join(DATA_DIR, filename);

  // Argumentos para o yt-dlp:
  const args = [
    // URL do YouTube
    youtubeUrl,
    // Argumentos de formato/saída:
    '--extract-audio',            // -x: extrair apenas o áudio
    '--audio-format', 'mp3',      // --audio-format: converter para MP3
    '--output', outputPathTemplate, // -o: caminho de saída e nome do arquivo
    '--retries', '3',             // Tenta novamente em caso de falha de rede
    '--no-playlist'               // Garante que se for uma playlist, baixe apenas o primeiro (ou o que for necessário)
  ];

  console.log(`[YT-DLP] ⚙️ Executando: ${YTDL_COMMAND} ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    // execFile é mais seguro que exec, pois evita problemas de injeção de shell.
    execFile(YTDL_COMMAND, args, { cwd: DATA_DIR }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[YT-DLP] 💥 STDERR: ${stderr}`);
        // Erros comuns (como "Não foi possível extrair", são tratados aqui)
        return reject(new Error(`Erro ao executar ${YTDL_COMMAND}. Verifique se ele está instalado corretamente. Detalhes: ${error.message}`));
      }

      // Se a execução foi bem-sucedida, o arquivo deve estar no local.
      console.log(`[YT-DLP] ✅ STDOUT: ${stdout}`);
      resolve(outputPathTemplate);
    });
  });
}