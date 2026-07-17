import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
} from 'discord.js';
import { assertGuildApi } from '../../services/guildConfigStore.js';

export const MENU_ID = 'menu_select_search_type';

export const data = new SlashCommandBuilder()
    .setName('pesquisar')
    .setDescription('Abre o menu principal de pesquisa TMDB.');

export async function execute(interaction) {
    try {
        await assertGuildApi(interaction.guildId, 'tmdb');
    } catch (error) {
        return interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
    }

    // 1. Cria o Embed que servirá como título do menu
    const menuEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Menu de pesquisa 🎥')
        .setDescription('Olá! Selecione abaixo o tipo de conteúdo que você deseja pesquisar.');

    // 2. Cria o Select Menu (Menu de Seleção)
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(MENU_ID) // ID que será usado no interactionCreate.js para identificar este menu
        .setPlaceholder('Escolha uma opção...')
        .addOptions([
            {
                label: '🎬 Buscar Filme',
                description: 'Busque por um filme.',
                value: 'movie',
            },
            {
                label: '📺 Buscar Série',
                description: 'Busque por uma série de TV.',
                value: 'tv',
            },
            {
                label: '👤 Buscar Pessoa',
                description: 'Busque por um ator, atriz ou diretor(a).',
                value: 'person',
            },
        ]);

    // 3. Coloca o Select Menu numa Action Row (Linha de Ação)
    const row = new ActionRowBuilder().addComponents(selectMenu);

    // 4. Envia a resposta com o Embed e o componente interativo
    await interaction.reply({
        embeds: [menuEmbed],
        components: [row],
        ephemeral: true, // Torna a mensagem visível apenas para o utilizador que a invocou
    });
}