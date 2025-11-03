// src/utils/paginationHandler.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionType } = require('discord.js');
const { 
    searchMovieByTitle, 
    searchTvByTitle, 
    searchPersonByName,
    discoverByGenre // <-- Importamos a nova função
} = require('../services/api_tmdb');

// --- IDs Genéricos (não mudam) ---
const PREV_RESULT_ID = 'page_prev_res';
const NEXT_RESULT_ID = 'page_next_res';
const PREV_PAGE_ID = 'page_prev_page';
const NEXT_PAGE_ID = 'page_next_page';
const FINISH_BUTTON_ID = 'page_finish';

// --- Função Central de Busca (MODIFICADA) ---
// Agora ela entende 'searchMode'
async function fetchData(searchType, query, page, searchMode) {
    if (searchMode === 'genre') {
        // Se o modo é 'genre', a 'query' é o ID do Gênero
        return discoverByGenre(searchType, query, page);
    }
    
    // Se o modo for 'title' (ou 'person' para tipo 'person')
    switch (searchType) {
        case 'movie':
            return searchMovieByTitle(query, page);
        case 'tv':
            return searchTvByTitle(query, page);
        case 'person':
            return searchPersonByName(query, page);
        default:
            throw new Error('Tipo de busca inválido.');
    }
}

// --- Função Central de Formatação (não muda) ---
function formatEmbedAndContent(searchType, item, currentIndex, totalResults, currentPage, totalPages) {
    let embed = new EmbedBuilder().setColor(0x0099ff).setFooter({ text: 'Fonte: The Movie Database (TMDB)' });
    let content = `**Página: ${currentPage} de ${totalPages}**\n**🔎 Resultado ${currentIndex + 1} de ${totalResults}**\n`;

    switch (searchType) {
        case 'movie':
            embed.setTitle(`Sinopse de: ${item.title}`).setDescription(item.overview).setImage(item.posterUrl);
            content += `**🎬 Filme:** ${item.title} (${item.originalTitle})\n**📅 Lançamento:** ${item.releaseDate}\n**⭐ Avaliação:** ${item.voteAverage}/10`;
            break;
        case 'tv':
            embed.setTitle(`Sinopse de: ${item.title}`).setDescription(item.overview).setImage(item.posterUrl);
            content += `**📺 Série:** ${item.title} (${item.originalTitle})\n**📅 Lançamento:** ${item.releaseDate}\n**⭐ Avaliação:** ${item.voteAverage}/10`;
            break;
        case 'person':
            embed.setTitle(item.title).setDescription(`**🎬 Departamento:** ${item.department}\n**⭐ Conhecido(a) por:** ${item.knownFor.substring(0, 500)}`).setThumbnail(item.posterUrl);
            content += `**👤 Nome:** ${item.title}\n**🎬 Departamento:** ${item.department}`;
            break;
    }
    return { content, embed };
}

/**
 * Inicia a interface de paginação para qualquer tipo de busca.
 * @param {import('discord.js').Interaction} interaction - A interação original.
 * @param {string} query - O termo de busca (título, nome ou ID de gênero).
 * @param {'movie' | 'tv' | 'person'} searchType - O tipo de busca.
 * @param {'title' | 'genre'} searchMode - O modo de busca.
 */
async function startPagination(interaction, query, searchType, searchMode = 'title') {
    
    // Se a interação não foi adiada (deferReply), nós adiamos.
    if (!interaction.deferred && !interaction.replied) {
        // Se a interação original foi 'ephemeral', a paginação também deve ser.
        await interaction.deferReply({ ephemeral: interaction.ephemeral || false });
    }

    try {
        let currentPage = 1;
        let apiResults = [];
        let totalPages = 1;
        let currentResultIndex = 0;

        // --- Função Central para Buscar e Atualizar o Estado (MODIFICADA) ---
        const fetchAndRender = async (pageToFetch) => {
            // Passa o searchMode para o fetchData
            const data = await fetchData(searchType, query, pageToFetch, searchMode);

            apiResults = data.results;
            currentPage = data.current_page;
            totalPages = data.total_pages;

            if (pageToFetch !== currentPage) {
                currentResultIndex = 0;
            }

            if (apiResults.length === 0) {
                // Mensagem de erro personalizada
                const errorQuery = searchMode === 'genre' ? `gênero ID ${query}` : `"${query}"`;
                throw new Error(`Nenhum resultado encontrado para: **${errorQuery}**.`);
            }

            return renderMessage(apiResults[currentResultIndex], currentResultIndex, apiResults.length, currentPage, totalPages);
        };

        // --- Função para Renderizar a Mensagem (não muda) ---
        const renderMessage = (currentItem, currentIdx, totalResOnPage, currentPg, totalPg) => {
            const isLastResultOnPage = currentIdx === totalResOnPage - 1;
            const isFirstPage = currentPg === 1;
            const isLastPage = currentPg === totalPg;

            const resultNavRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(PREV_RESULT_ID).setLabel('⬅️ Anterior').setStyle(ButtonStyle.Secondary).setDisabled(currentIdx === 0),
                new ButtonBuilder().setCustomId(NEXT_RESULT_ID).setLabel('Próximo(a) ➡️').setStyle(ButtonStyle.Secondary).setDisabled(isLastResultOnPage)
            );
            const pageNavRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(PREV_PAGE_ID).setLabel('⏪ Pág. Anterior').setStyle(ButtonStyle.Primary).setDisabled(isFirstPage),
                new ButtonBuilder().setCustomId(NEXT_PAGE_ID).setLabel('Pág. Próxima ⏩').setStyle(ButtonStyle.Primary).setDisabled(isLastPage)
            );
            const finishRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(FINISH_BUTTON_ID).setLabel('✅ Finalizar Busca').setStyle(ButtonStyle.Danger)
            );

            const { content, embed } = formatEmbedAndContent(searchType, currentItem, currentIdx, totalResOnPage, currentPg, totalPg);

            return {
                content: content,
                embeds: [embed], 
                components: [resultNavRow, pageNavRow, finishRow],
            };
        };

        // --- Inicializa a Busca ---
        const initialRender = await fetchAndRender(currentPage);
        
        // O editReply DEVE ser para a interação original
        const reply = await interaction.editReply(initialRender);

        if (totalPages === 0 || (totalPages === 1 && apiResults.length <= 1)) return;

        // --- Collector e Listeners (não mudam) ---
        const filter = i => i.user.id === interaction.user.id; 
        const collector = reply.createMessageComponentCollector({ filter, time: 900000 }); // 15 minutos

        collector.on('collect', async i => {
            await i.deferUpdate();
            const customId = i.customId;

            if (customId === FINISH_BUTTON_ID) {
                collector.stop('finished_by_user');
                return;
            }

            let shouldFetchNewPage = false;
            let pageToFetch = currentPage;

            if (customId === NEXT_RESULT_ID && currentResultIndex < apiResults.length - 1) {
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
                currentResultIndex = 0; 
                newRender = await fetchAndRender(pageToFetch);
            } else {
                newRender = renderMessage(apiResults[currentResultIndex], currentResultIndex, apiResults.length, currentPage, totalPages);
            }

            await i.editReply(newRender); // 'i' é a interação do *botão*, então editamos a resposta dela.
        });

        collector.on('end', async (collected, reason) => {
            const finalState = renderMessage(apiResults[currentResultIndex], currentResultIndex, apiResults.length, currentPage, totalPages);
            const disabledComponents = finalState.components.map(row =>
                new ActionRowBuilder().addComponents(
                    row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
                )
            );

            // Edita a resposta original (a da paginação)
            await interaction.editReply({
                content: (reason === 'finished_by_user') ? '✅ Busca finalizada.' : 'Tempo esgotado. Busca finalizada.',
                embeds: finalState.embeds,
                components: disabledComponents
            }).catch(() => {});
        });

    } catch (error) {
        console.error(`Erro na paginação (Tipo: ${searchType}, Modo: ${searchMode}, Query: "${query}"):`, error);
        const errorMessage = `❌ Ocorreu um erro ao processar a busca. Detalhe: ${error.message}`;
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: errorMessage, ephemeral: true, embeds: [], components: [] });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true, embeds: [], components: [] });
        }
    }
}

module.exports = { startPagination };