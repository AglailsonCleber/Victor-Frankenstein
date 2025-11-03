// src/utils/paginationHandler.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionType } = require('discord.js');
const { searchMovieByTitle, searchTvByTitle, searchPersonByName } = require('../services/api_tmdb');

// --- IDs Genéricos para os Botões ---
// Usaremos IDs genéricos e o filtro do collector (pelo ID do usuário)
// garantirá que apenas o autor original possa clicar.
const PREV_RESULT_ID = 'page_prev_res';
const NEXT_RESULT_ID = 'page_next_res';
const PREV_PAGE_ID = 'page_prev_page';
const NEXT_PAGE_ID = 'page_next_page';
const FINISH_BUTTON_ID = 'page_finish';

// --- Função Central de Busca ---
// Decide qual função da API chamar
async function fetchData(searchType, searchQuery, page) {
    switch (searchType) {
        case 'movie':
            return searchMovieByTitle(searchQuery, page);
        case 'tv':
            return searchTvByTitle(searchQuery, page);
        case 'person':
            return searchPersonByName(searchQuery, page);
        default:
            throw new Error('Tipo de busca inválido.');
    }
}

// --- Função Central de Formatação ---
// Cria o Embed e o Conteúdo com base no tipo de resultado
function formatEmbedAndContent(searchType, item, currentIndex, totalResults, currentPage, totalPages) {
    let embed = new EmbedBuilder().setColor(0x0099ff).setFooter({ text: 'Fonte: The Movie Database (TMDB)' });
    let content = `**Página: ${currentPage} de ${totalPages}**\n**🔎 Resultado ${currentIndex + 1} de ${totalResults}**\n`;

    switch (searchType) {
        case 'movie':
            embed
                .setTitle(`Sinopse de: ${item.title}`)
                .setDescription(item.overview)
                .setImage(item.posterUrl);
            content += `**🎬 Filme:** ${item.title} (${item.originalTitle})\n**📅 Lançamento:** ${item.releaseDate}\n**⭐ Avaliação:** ${item.voteAverage}/10`;
            break;
        case 'tv':
            embed
                .setTitle(`Sinopse de: ${item.title}`)
                .setDescription(item.overview)
                .setImage(item.posterUrl);
            content += `**📺 Série:** ${item.title} (${item.originalTitle})\n**📅 Lançamento:** ${item.releaseDate}\n**⭐ Avaliação:** ${item.voteAverage}/10`;
            break;
        case 'person':
            embed
                .setTitle(item.title)
                .setDescription(`**🎬 Departamento:** ${item.department}\n**⭐ Conhecido(a) por:** ${item.knownFor.substring(0, 500)}`)
                .setThumbnail(item.posterUrl); // Thumbnail para fotos de perfil
            content += `**👤 Nome:** ${item.title}\n**🎬 Departamento:** ${item.department}`;
            break;
    }
    return { content, embed };
}

/**
 * Inicia a interface de paginação para qualquer tipo de busca.
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').ModalSubmitInteraction} interaction - A interação original (do comando ou do modal).
 * @param {string} searchQuery - O termo a ser buscado.
 * @param {'movie' | 'tv' | 'person'} searchType - O tipo de busca.
 */
async function startPagination(interaction, searchQuery, searchType) {
    
    // Se a interação não foi adiada (deferReply), nós adiamos.
    // Isso é crucial para Modals, que precisam de um defer antes do pagination.
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
    }

    try {
        let currentPage = 1;
        let apiResults = [];
        let totalPages = 1;
        let currentResultIndex = 0;

        // --- Função Central para Buscar e Atualizar o Estado ---
        const fetchAndRender = async (pageToFetch) => {
            const data = await fetchData(searchType, searchQuery, pageToFetch);

            apiResults = data.results;
            currentPage = data.current_page;
            totalPages = data.total_pages;

            // Reseta o índice se a página mudou
            if (pageToFetch !== currentPage) {
                currentResultIndex = 0;
            }

            if (apiResults.length === 0) {
                throw new Error(`Nenhum resultado encontrado para: **${searchQuery}**.`);
            }

            return renderMessage(apiResults[currentResultIndex], currentResultIndex, apiResults.length, currentPage, totalPages);
        };

        // --- Função para Renderizar a Mensagem ---
        const renderMessage = (currentItem, currentIdx, totalResOnPage, currentPg, totalPg) => {
            const isLastResultOnPage = currentIdx === totalResOnPage - 1;
            const isFirstPage = currentPg === 1;
            const isLastPage = currentPg === totalPg;

            // 1. Botões de Navegação de Resultados
            const resultNavRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(PREV_RESULT_ID).setLabel('⬅️ Anterior').setStyle(ButtonStyle.Secondary).setDisabled(currentIdx === 0),
                new ButtonBuilder().setCustomId(NEXT_RESULT_ID).setLabel('Próximo(a) ➡️').setStyle(ButtonStyle.Secondary).setDisabled(isLastResultOnPage)
            );

            // 2. Botões de Navegação de Páginas
            const pageNavRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(PREV_PAGE_ID).setLabel('⏪ Pág. Anterior').setStyle(ButtonStyle.Primary).setDisabled(isFirstPage),
                new ButtonBuilder().setCustomId(NEXT_PAGE_ID).setLabel('Pág. Próxima ⏩').setStyle(ButtonStyle.Primary).setDisabled(isLastPage)
            );

            // 3. Botão Finalizar
            const finishRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(FINISH_BUTTON_ID).setLabel('✅ Finalizar Busca').setStyle(ButtonStyle.Danger)
            );

            const { content, embed } = formatEmbedAndContent(searchType, currentItem, currentIdx, totalResOnPage, currentPg, totalPg);

            return {
                content: content,
                embeds: [embed], // Embed está ativado!
                components: [resultNavRow, pageNavRow, finishRow],
            };
        };

        // --- Inicializa a Busca ---
        const initialRender = await fetchAndRender(currentPage);
        const reply = await interaction.editReply(initialRender);

        // Não cria collector se não houver navegação
        if (totalPages === 0 || (totalPages === 1 && apiResults.length <= 1)) return;

        // --- Collector e Listeners ---
        const filter = i => i.user.id === interaction.user.id; // Filtro de segurança!
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
                currentResultIndex = 0; // Reseta índice ao mudar de página
                newRender = await fetchAndRender(pageToFetch);
            } else {
                newRender = renderMessage(apiResults[currentResultIndex], currentResultIndex, apiResults.length, currentPage, totalPages);
            }

            await i.editReply(newRender);
        });

        collector.on('end', async (collected, reason) => {
            const finalState = renderMessage(apiResults[currentResultIndex], currentResultIndex, apiResults.length, currentPage, totalPages);
            
            const disabledComponents = finalState.components.map(row =>
                new ActionRowBuilder().addComponents(
                    row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
                )
            );

            await interaction.editReply({
                content: (reason === 'finished_by_user') ? '✅ Busca finalizada.' : 'Tempo esgotado. Busca finalizada.',
                embeds: finalState.embeds,
                components: disabledComponents
            }).catch(() => {});
        });

    } catch (error) {
        console.error(`Erro na paginação (${searchType}, query: "${searchQuery}"):`, error);
        const errorMessage = `❌ Ocorreu um erro ao processar a busca. Detalhe: ${error.message}`;
        // Garante que responderemos à interação mesmo em caso de falha
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: errorMessage, ephemeral: true, embeds: [], components: [] });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true, embeds: [], components: [] });
        }
    }
}

module.exports = { startPagination };