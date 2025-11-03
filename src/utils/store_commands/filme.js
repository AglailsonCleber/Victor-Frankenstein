// src/commands/slash/filme.js
const { SlashCommandBuilder } = require('discord.js');
// Importamos o nosso novo handler central
const { startPagination } = require('../paginationHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filme')
        .setDescription('Busca e navega pelos resultados de filmes no TMDB.')
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('O título do filme que você deseja buscar.')
                .setRequired(true)),

    async execute(interaction) {
        // 1. Adia a resposta (a busca pode demorar)
        await interaction.deferReply();
        
        // 2. Pega o termo de busca
        const searchQuery = interaction.options.getString('titulo');

        // 3. Chama o handler central!
        // Passamos a interação, o termo de busca e o tipo 'movie'
        await startPagination(interaction, searchQuery, 'movie');
    },
};