import { SlashCommandBuilder } from 'discord.js';
import { resolveSpotifyQuery } from '../../services/spotify.js';
import { resolveYoutubeQuery } from '../../services/youtube.js';
import QueueManager from '../../services/QueueManager.js';
import MediaTrack from '../../models/MediaTrack.js';
import { checkRateLimit } from '../../utils/rateLimiter.js';
import { env } from '../../config/env.js';

export const data = new SlashCommandBuilder()
    .setName('reproduzir')
    .setDescription('Toca uma música usando link ou termo de busca (streaming).')
    .addStringOption((option) =>
        option
            .setName('query')
            .setDescription('Link do YouTube/Spotify ou termo de pesquisa.')
            .setRequired(true)
    );

export async function execute(interaction) {
    await interaction.deferReply();

    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const rate = checkRateLimit(`reproduzir:${guildId}:${userId}`, env.rateLimitReproduzirMs());

    if (!rate.ok) {
        return interaction.editReply({
            content: `⏳ Aguarde ${rate.retryAfterSec}s antes de pedir outra música.`,
        });
    }

    const query = interaction.options.getString('query');
    let finalQuery = query;
    let source = 'Busca';
    const trackInfo = { title: null, artist: null, duration: 0, thumbnail: null };

    try {
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
                content: `❌ Não foi possível encontrar uma faixa no YouTube para: \`${finalQuery}\`.`,
            });
        }

        trackInfo.title = youtubeData.trackInfo.title;
        trackInfo.artist = youtubeData.trackInfo.artist;
        trackInfo.duration = youtubeData.trackInfo.duration;
        trackInfo.thumbnail = youtubeData.trackInfo.thumbnail;
        source = youtubeData.source || source;

        await interaction.editReply(`⏳ Conectando **${trackInfo.title}** (Fonte: ${source})...`);

        let player = interaction.client.queueManagers.get(guildId);
        if (!player) {
            player = new QueueManager(interaction.guild);
            interaction.client.queueManagers.set(guildId, player);
        }

        const newTrack = new MediaTrack(
            trackInfo.title,
            youtubeData.youtubeUrl,
            trackInfo.duration,
            interaction.user.tag,
            null,
            trackInfo.thumbnail,
            userId
        );

        player.addTrack(newTrack);
        const startMessage = await player.start(interaction.member, interaction.channel);

        await interaction.editReply({
            content: `✅ **${trackInfo.title}** adicionada à fila (streaming). ${startMessage || ''}`,
        });
    } catch (error) {
        console.error(`[REPRODUZIR] Erro para ${finalQuery}:`, error);
        await interaction.editReply({
            content: `❌ ${error.message}`,
        });
    }
}
