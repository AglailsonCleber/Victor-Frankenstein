// src/commands/slash/serie.js
const { SlashCommandBuilder } = require('discord.js');
const { startPagination } = require('../../utils/paginationHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serie')
        .setDescription('Busca e navega pelos resultados de séries de TV no TMDB.')
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('O título da série que você deseja buscar.')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        const searchQuery = interaction.options.getString('titulo');
        
        // A única diferença é aqui: passamos 'tv'
        await startPagination(interaction, searchQuery, 'tv');
    },
};