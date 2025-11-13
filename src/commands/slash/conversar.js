// src/commands/slash/conversar.js (Slash Command)

import { SlashCommandBuilder } from 'discord.js';
import { getGeminiResponse } from '../../services/api_gemini.js'; 
import { EmbedBuilder } from 'discord.js'; 

export const data = new SlashCommandBuilder()
    .setName('conversar')
    .setDescription('Inicia ou continua uma conversa com o monstro (mantém o contexto por canal).')
    .addStringOption(option =>
        option.setName('discussão')
            .setDescription('Sua discussão com o monstro começa aqui.')
            .setRequired(true)
    );

/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - O objeto de interação do Discord.
 */
export async function execute(interaction) {
    const prompt = interaction.options.getString('discussão');
    const channelId = interaction.channelId;

    // Responde ao Discord imediatamente para evitar o "Application did not respond"
    // Usamos deferReply para indicar que estamos processando (aparece "O bot está pensando...")
    await interaction.deferReply();

    try {
        // 1. Chama a função do Serviço Gemini
        const replyText = await getGeminiResponse(channelId, prompt);
        
        let finalReply = replyText;
        const MAX_LENGTH = 2000;

        // 2. Truncamento da resposta
        if (finalReply.length > MAX_LENGTH) {
            finalReply = finalReply.substring(0, MAX_LENGTH - 3) + "...";
        }
        
        // 3. Edita a resposta adiada (deferReply) com a resposta do Gemini
        await interaction.editReply({ content: finalReply });

    } catch (error) {
        console.error("Erro no processamento da API Gemini:", error.message);
        
        // 4. Tratamento de erro específico para limite de taxa (429)
        if (error.message && error.message.includes("429")) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription("⚠️ **Limite de Uso Excedido.**\\nO bot atingiu o limite de tokens ou requisições do plano gratuito. Tente novamente em alguns minutos ou amanhã.");
            
            await interaction.editReply({ embeds: [embed] });
        } else {
            // Tratamento de outros erros
            await interaction.editReply({ 
                content: `❌ Ocorreu um erro ao processar sua discussão: ${error.message.substring(0, 100)}...` 
            });
        }
    }
}