// src/utils/generatePlayerEmbed.js

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
// Não é necessário importar MediaTrack/QueueManager, pois o JSDoc já o faz

// --- IDs ÚNICOS para os botões (Devem coincidir com interactionCreate.js) ---
const BTN_ID_SKIP = 'player_skip';
const BTN_ID_PAUSE_RESUME = 'player_pause_resume';
const BTN_ID_STOP = 'player_stop';
const BTN_ID_QUEUE = 'player_queue';
const BTN_ID_LOOP = 'player_loop';
const BTN_ID_SHUFFLE = 'player_shuffle';
// --------------------------------------------------------------------------

/**
 * Gera um Embed com as informações da faixa atual e botões de controle do player.
 * @param {import('../services/QueueManager.js').default} player O gerenciador de fila do bot para o servidor.
 * @returns {{embeds: EmbedBuilder[], components: ActionRowBuilder[]}} Objeto com o embed e os componentes.
 */
export function generatePlayerEmbed(player) {
    const currentTrack = player.currentTrack;
    const queueLength = player.queue.length;
    // O status pode ser 'playing', 'paused', 'idle', 'buffering'
    const isPlaying = player.audioPlayer.state.status === 'playing' || player.audioPlayer.state.status === 'buffering';
    const isPaused = player.audioPlayer.state.status === 'paused';
    const hasTrack = !!currentTrack;
    
    // --- 1. O Embed ---
    const embed = new EmbedBuilder()
        .setColor(hasTrack ? '#0099ff' : '#aaaaaa')
        .setTitle(hasTrack ? `🎶 Tocando Agora: ${currentTrack.title}` : '🛑 Sem música tocando')
        .setDescription(hasTrack ? 
            `**Duração:** ${currentTrack.getFormattedDuration()}` + 
            `\n**Solicitado por:** ${currentTrack.requestedBy}` +
            (isPaused ? '\n\n**⏸️ MÚSICA PAUSADA**' : '')
            :
            'Adicione músicas à fila usando `/reproduzir <URL/termo>`'
        )
        .setThumbnail(hasTrack ? currentTrack.thumbnail : null)
        .setFooter({ text: `Próximas na fila: ${queueLength} | Loop: ${player.isLooping ? '✅' : '❌'} | Shuffle: ${player.isShuffling ? '✅' : '❌'}` })
        .setTimestamp(); // Adiciona o timestamp para indicar a última atualização

    // --- 2. Os Componentes (Botões) ---
    
    // Linha 1: Controles básicos
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(BTN_ID_SKIP)
                .setLabel('Pular')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⏭️')
                .setDisabled(!hasTrack), 
            
            new ButtonBuilder()
                .setCustomId(BTN_ID_PAUSE_RESUME)
                .setLabel(isPlaying ? 'Pausar' : 'Resumir')
                .setStyle(isPlaying ? ButtonStyle.Primary : ButtonStyle.Success)
                .setEmoji(isPlaying ? '⏸️' : '▶️')
                .setDisabled(!hasTrack),
            
            new ButtonBuilder()
                .setCustomId(BTN_ID_STOP)
                .setLabel('Parar')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🛑')
                .setDisabled(!hasTrack),
                
            new ButtonBuilder()
                .setCustomId(BTN_ID_QUEUE)
                .setLabel(`Fila (${queueLength})`) 
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📜'),
        );
        
    // Linha 2: Controles de modo
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(BTN_ID_LOOP)
                .setLabel(player.isLooping ? 'Desativar Loop' : 'Ativar Loop')
                .setStyle(player.isLooping ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('🔁'),
            new ButtonBuilder()
                .setCustomId(BTN_ID_SHUFFLE)
                .setLabel(player.isShuffling ? 'Desativar Shuffle' : 'Ativar Shuffle')
                .setStyle(player.isShuffling ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('🔀'),
        );

    return {
        embeds: [embed],
        components: [row1, row2],
    };
}