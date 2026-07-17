import { EmbedBuilder } from 'discord.js';

export const data = {
    name: 'ajuda',
    description: 'Mostra todos os comandos disponíveis.',
};

export async function execute(message) {
    const helpEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Ajuda — Victor-Frankenstein')
        .setDescription('Bot de entretenimento: TMDB, Gemini AI e música em canal de voz.')
        .addFields(
            {
                name: 'Comandos slash (/)',
                value:
                    '`/pesquisar` — Busca filmes, séries e pessoas (TMDB)\n' +
                    '`/conversar` — Chat com IA (Gemini)\n' +
                    '`/reproduzir` — Música por link ou busca (streaming)\n' +
                    '`/config` — API keys do servidor (admin)',
            },
            {
                name: 'Prefixo (!)',
                value:
                    '`!ping` — Teste de latência\n' +
                    '`!ajuda` — Esta mensagem\n' +
                    '`!skip`, `!pause`, `!resume`, `!stop`, `!queue` — Controles de fila',
            },
            {
                name: 'Configuração por servidor',
                value:
                    'Administradores podem usar `/config definir` para TMDB e Gemini.\n' +
                    'Cada servidor usa suas próprias keys, sem depender das keys globais do bot.',
            }
        )
        .setFooter({ text: 'Keys globais (.env) são fallback opcional.' });

    await message.reply({ embeds: [helpEmbed] });
}
