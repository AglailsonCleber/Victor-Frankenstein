// src/commands/prefix/ajuda.js (ES Module)

import { EmbedBuilder } from 'discord.js'; // Substitui require

// 1. Exporta 'data' como uma constante
export const data = {
    name: 'ajuda',
    description: 'Mostra todos os comandos disponíveis e o que eles fazem.',
};

// 2. Exporta 'execute' como uma função assíncrona
export async function execute(message, args) {
    const helpEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Ajuda do Frankenstein')
        .setDescription('Olá! Eu sou o bot do Victor-Frankenstein. Minha especialidade é não ter especialidades. Aqui está o que eu posso, mas não quero fazer:')
        .addFields(
            {
                name: 'Comandos de Barra (/)',
                value: 'Use estes comandos para interagir comigo. São apenas dois:'
            },
            {
                name: '`/pesquisar`',
                value: 'Abre o menu principal para você escolher o que deseja pesquisar (filmes, séries ou pessoas).'
            },
            {
                name: 'Comandos de Prefixo (!)',
                value: 'Comandos de utilidade e administração.'
            },
            {
                name: '`!ajuda`',
                value: 'Mostra esta mensagem de ajuda.'
            },
            {
                name: '`!ping`',
                value: 'Verifica se estou online e minha latência.'
            },
            {
                name: 'Comandos Administrativos (!)',
                value: 'Requer permissão de Administrador.',
                inline: false,
            },
            {
                name: '`!deploy-commands`',
                value: 'Registra os comandos de barra do bot neste servidor.',
                inline: true,
            },
            {
                name: '`!delete-my-guild`',
                value: 'Remove apenas os meus comandos de barra (/) deste servidor.',
                inline: true,
            },
            {
                name: '`!delete-my-global`',
                value: 'Remove meus comandos de barra (/) de todos os servidores globalmente.',
                inline: true,
            },
        )
        .setFooter({ text: 'Obrigado por me usar!' });

    await message.reply({ embeds: [helpEmbed] });
}