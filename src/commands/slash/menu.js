// src/commands/slash/menu.js
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder 
} = require('discord.js');

// ID único para este menu
const MENU_ID = 'menu_select_search_type';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('menu')
        .setDescription('Abre o menu principal de busca do TMDB.'),
        
    async execute(interaction) {
        
        const menuEmbed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Menu de Busca - Victor-Frankenstein')
            .setDescription('Olá! Selecione abaixo o que você deseja buscar no The Movie Database (TMDB).');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(MENU_ID)
            .setPlaceholder('Escolha uma opção...')
            .addOptions([
                {
                    label: '🎬 Buscar Filme',
                    description: 'Busque por um filme pelo título.',
                    value: 'movie', // O valor que será retornado
                },
                {
                    label: '📺 Buscar Série',
                    description: 'Busque por uma série de TV pelo título.',
                    value: 'tv',
                },
                {
                    label: '👤 Buscar Pessoa',
                    description: 'Busque por um ator, atriz ou diretor(a).',
                    value: 'person',
                },
            ]);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);

        // Responde ao usuário com o menu.
        // O restante da lógica (mostrar o formulário) será tratado no interactionCreate.js
        await interaction.reply({ 
            embeds: [menuEmbed], 
            components: [row],
            ephemeral: true // O menu é visível apenas para quem o chamou
        });
    },
};