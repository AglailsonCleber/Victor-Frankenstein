// src/commands/slash/pesquisar.js
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder 
} = require('discord.js');

const MENU_ID = 'menu_select_search_type';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pesquisar')
        .setDescription('Abre o menu principal de pesquisa.'),
        
    async execute(interaction) {
        
        const menuEmbed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Menu de pesquisa 🎥')
            .setDescription('Olá! Selecione abaixo o tipo de conteúdo que você deseja pesquisar.');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(MENU_ID)
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
        
        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ 
            embeds: [menuEmbed], 
            components: [row],
            ephemeral: true
        });
    },
};