// src/commands/slash/ajuda.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ajuda')
        .setDescription('Mostra todos os comandos disponíveis e o que eles fazem.'),
        
    async execute(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Ajuda do Victor-Frankenstein')
            .setDescription('Olá! Eu sou o bot Victor-Frankenstein. Minha especialidade é buscar informações sobre filmes e séries. Aqui está o que eu posso fazer:')
            .addFields(
                { 
                    name: 'Comandos de Barra (/)', 
                    value: 'Use estes comandos para interagir comigo.' 
                },
                { 
                    name: '`/ajuda`', 
                    value: 'Mostra esta mensagem de ajuda.' 
                },
                { 
                    name: '`/filme [titulo]`', 
                    value: 'Busca por um filme no TMDB. Use os botões para navegar pelos resultados.' 
                },
                { 
                    name: '`/serie [titulo]`', 
                    value: 'Busca por uma série de TV no TMDB. Também possui botões de navegação.' 
                },
                { 
                    name: '`/pessoa [nome]`', 
                    value: 'Busca por atores, atrizes ou diretores no TMDB.' 
                },
                { 
                    name: 'Comandos de Prefixo (!)', 
                    value: 'Comandos de utilidade.' 
                },
                { 
                    name: '`!ping`', 
                    value: 'Verifica se estou online e minha latência.' 
                }
            )
            .setFooter({ text: 'Obrigado por me usar!' });

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true }); // 'ephemeral: true' faz com que a mensagem só apareça para quem digitou o comando.
    },
};