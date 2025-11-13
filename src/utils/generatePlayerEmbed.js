// src/utils/generatePlayerEmbed.js (ou em uma pasta 'embeds')

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
// Assumindo que o MediaTrack é importado corretamente para acessar os métodos de formatação
import MediaTrack from '../models/MediaTrack.js'; 
import QueueManager from '../services/QueueManager.js'; 

// --- IDs de Botões (Devem ser únicos e consistentes com o interactionCreate.js) ---
const BTN_SKIP = 'player_skip';
const BTN_PAUSE_RESUME = 'player_pause_resume';
const BTN_STOP = 'player_stop';
const BTN_QUEUE = 'player_queue';
const BTN_LOOP = 'player_loop';
const BTN_SHUFFLE = 'player_shuffle';
// ----------------------------------------------------------------------------------


/**
 * Gera um Embed com as informações da faixa atual e botões de controlo do player.
 * @param {QueueManager} player O gerenciador de fila do bot para o servidor.
 * @returns {{embeds: EmbedBuilder[], components: ActionRowBuilder[]}} Objeto com o embed e os componentes.
 */
export function generatePlayerEmbed(player) {
    const currentTrack = player.currentTrack;
    const queueLength = player.queue.length;
    // O status pode ser 'playing', 'paused', 'autopaused', 'idle' (conforme documentação @discordjs/voice)
    const isPlaying = player.audioPlayer?.state?.status === 'playing';

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(currentTrack ? `🎶 Tocando Agora: ${currentTrack.title}` : 'Sem música tocando')
        .setDescription(currentTrack ? 
            `**Duração:** ${currentTrack.getFormattedDuration()}\n` +
            `**Solicitado por:** ${currentTrack.requestedBy}` : 
            'Adicione músicas à fila usando `/reproduzir <URL/termo>`'
        )
        // Se houver uma miniatura, usa-a
        .setThumbnail(currentTrack?.thumbnail || null)
        .setFooter({ 
            text: `Próximas na fila: ${queueLength} | Loop: ${player.isLooping ? '✅ Ativo' : '❌ Desativado'} | Shuffle: ${player.isShuffling ? '✅ Ativo' : '❌ Desativado'}` 
        })
        .setTimestamp(); // Adiciona o timestamp para mostrar quando foi atualizado

    // ----------------------------------------------------------------
    // LINHA 1: Controles Principais
    // ----------------------------------------------------------------
    
    const row1 = new ActionRowBuilder()
        .addComponents(
            // Botão Pular (Skip)
            new ButtonBuilder()
                .setCustomId(BTN_SKIP)
                .setLabel('Pular')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⏭️'),
            
            // Botão Pausar/Resumir (Muda de cor e texto dependendo do estado)
            new ButtonBuilder()
                .setCustomId(BTN_PAUSE_RESUME)
                .setLabel(isPlaying ? 'Pausar' : 'Resumir')
                .setStyle(isPlaying ? ButtonStyle.Primary : ButtonStyle.Success)
                .setEmoji(isPlaying ? '⏸️' : '▶️'),
                
            // Botão Parar (Stop)
            new ButtonBuilder()
                .setCustomId(BTN_STOP)
                .setLabel('Parar')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🛑'),
                
            // Botão Fila (Queue)
            new ButtonBuilder()
                .setCustomId(BTN_QUEUE)
                .setLabel('Fila')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📜'),
        );
    
    // ----------------------------------------------------------------
    // LINHA 2: Opções de Fila
    // ----------------------------------------------------------------

    const row2 = new ActionRowBuilder()
        .addComponents(
            // Botão Loop
            new ButtonBuilder()
                .setCustomId(BTN_LOOP)
                .setLabel(player.isLooping ? 'Loop Ativo' : 'Ativar Loop')
                // Se estiver ativo, use uma cor diferente para feedback visual
                .setStyle(player.isLooping ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('🔁'),
            
            // Botão Shuffle
            new ButtonBuilder()
                .setCustomId(BTN_SHUFFLE)
                .setLabel(player.isShuffling ? 'Shuffle Ativo' : 'Ativar Shuffle')
                .setStyle(player.isShuffling ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('🔀'),
        );

    // Retorna o Embed e as linhas de botões (Actions Rows)
    return {
        embeds: [embed],
        components: [row1, row2],
    };
}