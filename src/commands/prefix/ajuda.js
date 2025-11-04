// src/commands/prefix/ajuda.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'ajuda',
        description: 'Mostra todos os comandos disponíveis e o que eles fazem.',
    },
    
    async execute(message, args) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Ajuda do Victor-Frankenstein')
            .setDescription('Olá! Eu sou o bot Victor-Frankenstein. Minha especialidade é buscar informações sobre filmes e séries. Aqui está o que eu posso fazer:')
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
    },
};