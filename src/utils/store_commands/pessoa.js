// src/commands/slash/pessoa.js
const { SlashCommandBuilder } = require('discord.js');
const { startPagination } = require('../paginationHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pessoa')
        .setDescription('Busca e navega pelos resultados de pessoas (atores, diretores) no TMDB.')
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('O nome da pessoa que você deseja buscar.')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        const searchQuery = interaction.options.getString('nome');

        // A única diferença é aqui: passamos 'person'
        await startPagination(interaction, searchQuery, 'person');
    },
};