// src/commands/prefix/ajuda.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
    // Definimos os dados para o handler de prefixo
    data: {
        name: 'ajuda', // O nome do comando (ex: !ajuda)
        description: 'Mostra todos os comandos disponíveis e o que eles fazem.',
    },
    
    // A função execute recebe message e args (argumentos)
    async execute(message, args) {
        // CORREÇÃO: Atualizamos os comandos de prefixo para refletir as novas funções administrativas.
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

        // Em comandos de prefixo, não podemos usar ephemeral, mas podemos deletar a mensagem original
        // e enviar a resposta de volta.
        await message.reply({ embeds: [helpEmbed] }); 
    },
};