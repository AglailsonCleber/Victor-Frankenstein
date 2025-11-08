import { SlashCommandBuilder } from 'discord.js';
import ytdl from 'ytdl-core';
import yts from 'yt-search';
import path from 'path';
import fsp from 'fs/promises';
import { downloadAudioYtDlp } from '../../utils/downloadAudioYtDlp.js';
import { localPlayer } from '../../controller/localPlayer.js';
import { obterInsultoAleatorio } from '../../controller/insultos.js';
import { resolveSpotifyQuery } from '../../controller/spotify.js';

// ----------------------------------------------------------------------
// Definição do comando slash
// ----------------------------------------------------------------------

export const data = new SlashCommandBuilder()
  .setName('reproduzir')
  .setDescription('▶️ Reproduz áudio no canal de voz do bot.')
  .addStringOption((option) =>
    option
      .setName('query')
      .setDescription('Link do YouTube/Spotify ou termo de pesquisa')
      .setRequired(true)
  );

// ----------------------------------------------------------------------
// Execução do comando
// ----------------------------------------------------------------------
export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: false });

  const query = interaction.options.getString('query');

  let finalQuery = query;
  let trackInfo = { artist: 'Desconhecido', title: 'Música Desconhecida' };
  let youtubeUrl = null;
  let source = 'Busca';

  // 1. Resolve Spotify (se for uma URL)
  const spotifyData = await resolveSpotifyQuery(query);
  if (spotifyData) {
    finalQuery = spotifyData.query;
    trackInfo.artist = spotifyData.artist;
    trackInfo.title = spotifyData.title;
    source = 'Spotify';
  }

  console.log(`[QUERY] 🔍 Consulta final resolvida: "${finalQuery}" (Fonte: ${source})`);
  // 2. Resolve YouTube (Link Direto ou Pesquisa)
  if (ytdl.validateURL(query)) {
    console.log(`[YT-DIRECT] 🔗 Link do YouTube detectado: ${query}`);
    // É um link direto do YouTube
    try {
      // Usamos ytdl.getInfo APENAS para obter os metadados
      console.log(`[YT-DIRECT] ⏳ Obtendo metadados do YouTube...`);
      const info = await ytdl.getBasicInfo(query);
      console.log(`[YT-DIRECT] ✅ Metadados obtidos: ${info}`);
      youtubeUrl = query;
      trackInfo.title = info.videoDetails.title;
      trackInfo.artist = info.videoDetails.author.name || 'Artista Desconhecido';
      source = 'YouTube Direto';
      console.log(`[YT-DIRECT] 🎯 URL direta detectada: ${youtubeUrl}`);
    } catch (e) {
      return interaction.editReply({
        content: '❌ Link do YouTube parece inválido, privado ou foi removido.'
      });
    }

  } else {
    // É uma busca (ou foi resolvido via Spotify)
    try {
      console.log(`[YT-SEARCH] 🔎 Buscando no YouTube: "${finalQuery}"`);

      const results = await yts(finalQuery);
      const video = results.videos[0];

      if (!video) {
        return interaction.editReply({
          content: `❌ Nenhum resultado encontrado no YouTube para: \`${finalQuery}\`.`
        });
      }

      youtubeUrl = video.url;
      if (source !== 'Spotify') {
        trackInfo.title = video.title;
        trackInfo.artist = video.author.name || 'Artista Desconhecido';
      }

      console.log(`[YT-SEARCH] ✅ Vídeo encontrado: ${video.title}`);
    } catch (error) {
      console.error('❌ Erro ao pesquisar no YouTube:', error);
      return interaction.editReply({
        content: '❌ Ocorreu um erro ao pesquisar no YouTube.'
      });
    }
  }

  // 3. Formata e Inicia o Download

  // Cria nomes de arquivo seguros (substitui caracteres não alfanuméricos por nada)
  const safeTitle = trackInfo.title.replace(/[^\w\s-]/g, '').trim().substring(0, 100);
  const safeArtist = trackInfo.artist.replace(/[^\w\s-]/g, '').trim().substring(0, 50);
  const filename = `${safeArtist} - ${safeTitle}.mp3`;

  try {
    const downloadMsg = `🎶 Identificado (${source}): **${trackInfo.title}** por **${trackInfo.artist}**\n⬇️ Iniciando carregamento de arquivo...`;
    await interaction.editReply({ content: downloadMsg });

    // Chama a nova função de download baseada em yt-dlp
    const finalPath = await downloadAudioYtDlp(youtubeUrl, filename);

    // 4. Resposta Final
    const successMsg = `✅ Concluído!\nArquivo carregado: \`/data/${path.basename(finalPath)}\``;

    await interaction.editReply({ content: successMsg });

    console.log(`[INSULTO] 🤖 ${await obterInsultoAleatorio()}`);

    await localPlayer(path.basename(finalPath), finalQuery, interaction);

  } catch (error) {
    console.error(`💥 Erro fatal no download: ${error.message}`);
    await interaction.editReply({
      content:
        `❌ Não foi possível carregar mídia: \`${error.message}\``
    });
    // Garante a limpeza em caso de falha na conexão
    if (finalPath) {
      try {
        console.log(`[CLEANUP] 🗑️ Tentando deletar arquivo após falha na conexão: ${path.basename(finalPath)}`);
        await fsp.unlink(finalPath);
      } catch (e) {
        console.error(`[CLEANUP] ❌ Falha ao deletar arquivo: ${e.message}`);
      }
    }
    if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
      connection.destroy();
    }
  }
}
