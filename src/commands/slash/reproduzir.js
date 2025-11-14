// src/commands/slash/reproduzirMidia.js

import { SlashCommandBuilder } from 'discord.js';
import path from 'path';
import { downloadAudioYtDlp } from '../../utils/downloadAudioYtDlp.js'; // Função de download
import { resolveSpotifyQuery } from '../../services/spotify.js';       // Serviço de Spotify
import { resolveYoutubeQuery } from '../../services/youtube.js';         // Serviço de YouTube
import QueueManager from '../../services/QueueManager.js';              // O Player/Fila
import MediaTrack from '../../models/MediaTrack.js';                    // Modelo da Faixa
import { deleteLocalFile } from '../../utils/fileCleanup.js';           // Para limpeza em caso de falha pós-download

// ----------------------------------------------------------------------
// Configuração do Comando
// ----------------------------------------------------------------------
export const data = new SlashCommandBuilder()
    .setName('reproduzir')
    .setDescription('Toca uma música usando um link ou termo de pesquisa.')
    .addStringOption(option =>
        option.setName('query')
            .setDescription('Link do YouTube/Spotify ou termo de pesquisa.')
            .setRequired(true));

// ----------------------------------------------------------------------
// Função de Execução do Comando
// ----------------------------------------------------------------------
export async function execute(interaction) {
    await interaction.deferReply(); // Faz o defer imediato

    const query = interaction.options.getString('query');
    let youtubeUrl;
    let finalQuery = query;
    let source = 'Busca';
    const trackInfo = { title: null, artist: null, duration: 0, thumbnail: null };

    // 1. Resolução da Query (Spotify ou YouTube)
    const spotifyData = await resolveSpotifyQuery(query);
    if (spotifyData) {
        finalQuery = spotifyData.query;
        trackInfo.title = spotifyData.title;
        trackInfo.artist = spotifyData.artist;
        source = 'Spotify';
    }

    const youtubeData = await resolveYoutubeQuery(finalQuery);
    if (!youtubeData) {
        return interaction.editReply({
            content: `❌ Não foi possível encontrar uma faixa no YouTube para: \`${finalQuery}\`.`
        });
    }

    youtubeUrl = youtubeData.youtubeUrl;
    trackInfo.title = youtubeData.trackInfo.title;
    trackInfo.artist = youtubeData.trackInfo.artist;
    trackInfo.duration = youtubeData.trackInfo.duration;
    trackInfo.thumbnail = youtubeData.trackInfo.thumbnail;

    // Constrói o nome do arquivo local para o download
    const filename = `${trackInfo.artist} - ${trackInfo.title}.mp3`.replace(/[<>:"/\\|?*]/g, '_');
    
    let finalPath = null; 

    try {
        await interaction.editReply(`⏳ Carregando **${trackInfo.title}** (Fonte: ${source})...`);
        
        // 2. Download da Mídia
        finalPath = await downloadAudioYtDlp(youtubeUrl, filename);
        
        // 3. Integração com QueueManager
        const guildId = interaction.guildId;
        let player = interaction.client.queueManagers.get(guildId);
        
        // Cria o QueueManager se não existir
        if (!player) {
            player = new QueueManager(interaction.guild);
            interaction.client.queueManagers.set(guildId, player);
        }

        // Cria o MediaTrack com o caminho do arquivo local! << CORREÇÃO: filePath é essencial
        const newTrack = new MediaTrack(
            trackInfo.title,
            youtubeUrl, 
            trackInfo.duration, 
            interaction.user.tag,
            path.basename(finalPath), // << ARMAZENA SÓ O NOME DO ARQUIVO PARA O MANAGER
            trackInfo.thumbnail
        );

        // Adiciona e inicia a reprodução se necessário
        player.addTrack(newTrack);
        const startMessage = await player.start(interaction.member, interaction.channel);
        
        await interaction.editReply({ 
            content: `✅ Concluído! Faixa **${trackInfo.title}** adicionada à fila. ${startMessage || ''}` 
        });

    } catch (error) {
        console.error(`💥 Erro na reprodução de mídia para ${finalQuery}:`, error);

        // 4. LIMPEZA EM CASO DE FALHA PÓS-DOWNLOAD
        // Se o download foi concluído (finalPath existe), mas a reprodução falhou
        if (finalPath) {
            await deleteLocalFile(path.basename(finalPath)).catch(e => {
                console.error(`[CLEANUP] ❌ Falha na exclusão após erro de reprodução: ${e.message}`);
            });
        }
        
        await interaction.editReply({
            content: `❌ Ocorreu um erro ao tentar reproduzir a mídia. Detalhes: ${error.message}`
        });
    }
}