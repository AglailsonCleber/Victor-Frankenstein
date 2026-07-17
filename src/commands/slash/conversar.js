import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getGeminiResponse } from '../../services/api_gemini.js';
import { checkRateLimit } from '../../utils/rateLimiter.js';
import { env } from '../../config/env.js';

export const data = new SlashCommandBuilder()
    .setName('conversar')
    .setDescription('Conversa com o monstro (contexto por canal).')
    .addStringOption((option) =>
        option
            .setName('discussão')
            .setDescription('Sua mensagem para o monstro.')
            .setRequired(true)
    );

export async function execute(interaction) {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    const userId = interaction.user.id;
    const prompt = interaction.options.getString('discussão');

    const rate = checkRateLimit(`conversar:${guildId}:${userId}`, env.rateLimitConversarMs());
    if (!rate.ok) {
        return interaction.reply({
            content: `⏳ Calma aí — aguarde ${rate.retryAfterSec}s antes de enviar outra mensagem.`,
            ephemeral: true,
        });
    }

    await interaction.deferReply();

    try {
        const replyText = await getGeminiResponse(guildId, channelId, prompt);
        const finalReply =
            replyText.length > 2000 ? `${replyText.substring(0, 1997)}...` : replyText;

        await interaction.editReply({ content: finalReply });
    } catch (error) {
        console.error('[CONVERSAR] Erro Gemini:', error.message);

        if (error.message?.includes('429')) {
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setDescription(
                    '⚠️ **Limite de uso excedido.** Tente novamente em alguns minutos.'
                );
            return interaction.editReply({ embeds: [embed] });
        }

        await interaction.editReply({
            content: `❌ ${error.message}`,
        });
    }
}
