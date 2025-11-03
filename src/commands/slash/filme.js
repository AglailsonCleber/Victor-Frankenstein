// src/commands/slash/filme.js
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    InteractionType, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const { searchMovieByTitle } = require('../../services/api_tmdb');

// Constantes para Custom IDs
const PREV_RESULT_ID = 'filme_prev_res'; // Anterior (Resultado na página)
const NEXT_RESULT_ID = 'filme_next_res'; // Próximo (Resultado na página)
const PREV_PAGE_ID = 'filme_prev_page';   // Anterior (Página da API)
const NEXT_PAGE_ID = 'filme_next_page';   // Próximo (Página da API)
const FINISH_BUTTON_ID = 'filme_finish';

function createFieldsResponse(movieData, currentIndex, totalResults, currentPage, totalPages) {
    return [
        `**Página: ${currentPage} de ${totalPages}**`,
        `**🔎 Resultado ${currentIndex + 1} de ${totalResults}**`,
        `**🎬 Filme:** ${movieData.title} (${movieData.originalTitle})`,
        `**📅 Lançamento:** ${movieData.releaseDate || 'N/A'}`,
        `**⭐ Avaliação TMDB:** ${movieData.voteAverage}/10`,
        `**📝 Sinopse:** ${movieData.overview.substring(0, 400) + (movieData.overview.length > 400 ? '...' : '')}`,
        // `**🔗 Link TMDB:** https://www.themoviedb.org/movie/${movieData.id}`
    ].join('\n');
}

function createMovieEmbed(movieData) {
    return new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`Sinopse de: ${movieData.title}`)
        .setDescription(movieData.overview.substring(0, 400) + (movieData.overview.length > 400 ? '...' : ''))
        .setImage(movieData.posterUrl)
        .setFooter({ text: 'Fonte: The Movie Database (TMDB)' });
}

// --- Lógica Principal ---

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filme')
        .setDescription('Busca e navega pelos resultados de filmes no TMDB.')
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('O título do filme que você deseja buscar.')
                .setRequired(true)),

    async execute(interaction) {
        const movieTitle = interaction.options.getString('titulo');
        if (interaction.type !== InteractionType.ApplicationCommand) return;
        
        await interaction.deferReply(); 

        try {

            let currentPage = 1;
            let movieResults = []; 
            let totalPages = 1;
            let currentResultIndex = 0; 

            // --- Função Central para Buscar e Atualizar o Estado ---
            const fetchAndRender = async (pageToFetch) => {
                const data = await searchMovieByTitle(movieTitle, pageToFetch);
                
                // Atualiza os estados globais da busca
                movieResults = data.movies;
                currentPage = data.current_page;
                totalPages = data.total_pages;
                
                // Se mudou de página, resetar o índice do filme para 0
                if (pageToFetch !== currentPage) { 
                    currentResultIndex = 0;
                }

                if (movieResults.length === 0) {
                    // Lança um erro se não houver resultados
                    throw new Error(`Nenhum resultado encontrado para o filme: **${movieTitle}**.`);
                }

                return renderMessage(movieResults[currentResultIndex], currentResultIndex, movieResults.length, currentPage, totalPages);
            };
            
            // --- Função para Renderizar a Mensagem ---
            const renderMessage = (currentMovie, currentIdx, totalRes, currentPg, totalPg) => {
                const totalResultsOnPage = totalRes;
                const isLastResultOnPage = currentIdx === totalResultsOnPage - 1;
                const isFirstPage = currentPg === 1;
                const isLastPage = currentPg === totalPg;

                // 1. Botões de Navegação de Resultados (Filmes dentro da página)
                const resultNavRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(PREV_RESULT_ID)
                        .setLabel('⬅️ Filme Anterior')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentIdx === 0),
                    
                    // Botão Próximo: Desabilitado apenas no último resultado da página
                    new ButtonBuilder()
                        .setCustomId(NEXT_RESULT_ID)
                        .setLabel('Filme Próximo ➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(isLastResultOnPage) 
                );

                // 2. Botões de Navegação de Páginas (Páginas da API)
                const pageNavRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(PREV_PAGE_ID)
                        .setLabel('⏪ Pág. Anterior')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(isFirstPage),

                    new ButtonBuilder()
                        .setCustomId(NEXT_PAGE_ID)
                        .setLabel('Pág. Próxima ⏩')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(isLastPage)
                );
                
                // 3. Botão Finalizar (SEMPRE DISPONÍVEL)
                const finishRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(FINISH_BUTTON_ID)
                        .setLabel('✅ Finalizar Busca')
                        .setStyle(ButtonStyle.Danger) // DANGER para destaque e finalização
                );

                const content = createFieldsResponse(currentMovie, currentIdx, totalResultsOnPage, currentPg, totalPg);
                const embed = createMovieEmbed(currentMovie);

                return {
                    content: content,
                    // embeds: [embed],
                    components: [resultNavRow, pageNavRow, finishRow], // Três linhas de botões
                };
            };
            
            // --- Inicializa a Busca ---
            let initialRender = await fetchAndRender(currentPage);
            const reply = await interaction.editReply(initialRender);
            
            if (totalPages === 0 || (totalPages === 1 && movieResults.length <= 1)) return;

            // --- Collector e Listeners ---
            const allCustomIds = [PREV_RESULT_ID, NEXT_RESULT_ID, PREV_PAGE_ID, NEXT_PAGE_ID, FINISH_BUTTON_ID];
            const filter = i => allCustomIds.includes(i.customId) && i.user.id === interaction.user.id; 

            const collector = reply.createMessageComponentCollector({
                filter,
                time: 900000, // 15 minutos
            });

            collector.on('collect', async i => {
                await i.deferUpdate(); 

                const customId = i.customId;

                if (customId === FINISH_BUTTON_ID) {
                    collector.stop('finished_by_user');
                    return;
                }

                let shouldFetchNewPage = false;
                let pageToFetch = currentPage;

                if (customId === NEXT_RESULT_ID && currentResultIndex < movieResults.length - 1) {
                    currentResultIndex++;
                } else if (customId === PREV_RESULT_ID && currentResultIndex > 0) {
                    currentResultIndex--;
                } else if (customId === NEXT_PAGE_ID && currentPage < totalPages) {
                    pageToFetch = currentPage + 1;
                    shouldFetchNewPage = true;
                } else if (customId === PREV_PAGE_ID && currentPage > 1) {
                    pageToFetch = currentPage - 1;
                    shouldFetchNewPage = true;
                } else {
                    return; 
                }

                let newRender;

                if (shouldFetchNewPage) {
                    newRender = await fetchAndRender(pageToFetch);
                } else {
                    newRender = renderMessage(movieResults[currentResultIndex], currentResultIndex, movieResults.length, currentPage, totalPages);
                }
                
                await i.editReply(newRender);
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'finished_by_user') {
                    // Finalizado pelo usuário (botão Finalizar)
                    await interaction.editReply({ 
                        content: `✅ Busca de filmes finalizada pelo usuário.`,
                        // embeds: [],
                        components: [] 
                    });
                } else {
                    // Finalizado por tempo limite (timeout)
                    const lastRender = renderMessage(movieResults[currentResultIndex], currentResultIndex, movieResults.length, currentPage, totalPages);
                    
                    const disabledComponents = lastRender.components.map(row => 
                        new ActionRowBuilder().addComponents(
                            row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
                        )
                    );
                    
                    await interaction.editReply({
                        content: lastRender.content,
                        embeds: lastRender.embeds,
                        components: disabledComponents
                    }).catch(e => console.error("Erro ao desabilitar botões:", e));
                }
            });
        
        } catch (error) {
            console.error(`Erro ao buscar filme "${movieTitle}":`, error);
            
            const errorMessage = `❌ Ocorreu um erro ao processar a busca. Detalhe: ${error.message}`;

            // Usa editReply se ainda puder, ou followUp se a interação original já tiver expirado.
            await interaction.editReply({ 
                content: errorMessage, 
                ephemeral: true 
            }).catch(() => interaction.followUp({ content: errorMessage, ephemeral: true }));
        }
    },
};