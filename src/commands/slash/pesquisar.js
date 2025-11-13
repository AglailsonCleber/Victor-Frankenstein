// src/commands/slash/pesquisar.js (ES Module)

import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} from 'discord.js'; // Mudar require para import

// ID ÚNICO para o componente (necessário para o interactionCreate.js)
export const MENU_ID = 'menu_select_search_type'; 

// 1. Exportar 'data' como uma constante para o handler
export const data = new SlashCommandBuilder()
    .setName('pesquisar')
    .setDescription('Abre o menu principal de pesquisa.');

// 2. Exportar 'execute' como uma função assíncrona
/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction O objeto de interação de comando de barra.
 */
export async function execute(interaction) {

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