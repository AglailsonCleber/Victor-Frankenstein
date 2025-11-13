// src/commands/slash/reproduzirMidia.js

import { SlashCommandBuilder } from 'discord.js';
import ytdl from 'ytdl-core';
import yts from 'yt-search';
import path from 'path';
import fsp from 'fs/promises';
import { downloadAudioYtDlp } from '../../utils/downloadAudioYtDlp.js';
import { localPlayer } from '../../services/localPlayer.js';
import { obterInsultoAleatorio } from '../../services/insultos.js';
import { resolveSpotifyQuery } from '../../services/spotify.js';

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
/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction O objeto de interação.
 */
export async function execute(interaction) {
  // Resposta imediata, não-efémera, para que a mensagem de status seja pública
  await interaction.deferReply({ ephemeral: false });

  const query = interaction.options.getString('query');

  let finalQuery = query;
  // Objeto para armazenar as informações da faixa
  let trackInfo = { artist: 'Desconhecido', title: 'Música Desconhecida' };
  let youtubeUrl = null;
  let source = 'Busca';
  let finalPath = null; // Caminho do arquivo baixado (para limpeza)

  // 1. Tentar resolver consulta do Spotify
  const spotifyData = await resolveSpotifyQuery(query);
  if (spotifyData) {
    source = 'Spotify';
    finalQuery = spotifyData.query;
    trackInfo.artist = spotifyData.artist;
    trackInfo.title = spotifyData.title;
  }

  // 2. Resolver consulta para URL do YouTube
  if (ytdl.validateURL(finalQuery)) {
    // É um link direto do YouTube
    source = 'YouTube Direto';
    try {
        // Obtém metadados para título e artista
        const info = await ytdl.getBasicInfo(finalQuery);
        youtubeUrl = finalQuery;
        trackInfo.title = info.videoDetails.title;
        trackInfo.artist = info.videoDetails.author.name || 'Artista Desconhecido';
        console.log(`[QUERY] 🎯 URL direta detectada: ${youtubeUrl}`);
    } catch (e) {
        return interaction.editReply({
            content: '❌ Link do YouTube parece inválido, privado ou foi removido.'
        });
    }

  } else {
    // É uma busca (ou foi resolvida via Spotify)
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
      // Se a fonte não for Spotify, use os dados da busca do YouTube
      if (source !== 'Spotify') {
        trackInfo.title = video.title;
        trackInfo.artist = video.author.name || 'Artista Desconhecido';
        source = 'Busca YT';
      }

      console.log(`[YT-SEARCH] ✅ Vídeo encontrado: ${video.title}`);
    } catch (error) {
      console.error('❌ Erro ao pesquisar no YouTube:', error);
      return interaction.editReply({
        content: '❌ Ocorreu um erro ao pesquisar no YouTube.'
      });
    }
  }
  
  // 3. Download e Conversão do Áudio
  // Normaliza o nome do arquivo para evitar problemas de filesystem
  const safeTitle = trackInfo.title.replace(/[^\w\s-]/g, '').trim().substring(0, 100);
  const safeArtist = trackInfo.artist.replace(/[^\w\s-]/g, '').trim().substring(0, 50);
  const filename = `${safeArtist} - ${safeTitle}.mp3`;

  try {
    const downloadMsg = `🎶 Identificado (${source}): **${trackInfo.title}** por **${trackInfo.artist}**\n⬇️ Iniciando carregamento de arquivo...`;
    await interaction.editReply({ content: downloadMsg });

    // Chama a função de download (usa yt-dlp)
    finalPath = await downloadAudioYtDlp(youtubeUrl, filename);

    // 4. Iniciar a Reprodução
    const successMsg = `✅ Carregamento concluído!\nO áudio **${trackInfo.title}** está sendo reproduzido.`;
    await interaction.editReply({ content: successMsg });

    // Passa o nome do arquivo, a query (para referência), e a interação para o Player
    await localPlayer(path.basename(finalPath), finalQuery, interaction);

  } catch (error) {
    console.error(`💥 Erro fatal no download/reprodução: ${error.message}`);
    await interaction.editReply({
      content:
        `❌ Não foi possível carregar mídia: \`${error.message}\``
    });
    
    // Garante a limpeza do arquivo local em caso de falha
    if (finalPath) {
      try {
        // Usa `fsp.unlink` para deletar o arquivo e `catch` para ignorar se já não existir
        await fsp.unlink(finalPath); 
        console.log(`[CLEANUP] 🗑️ Arquivo deletado após falha: ${path.basename(finalPath)}`);
      } catch (e) {
        console.error(`[CLEANUP] ❌ Falha ao deletar arquivo: ${e.message}`);
      }
    }
  }
}