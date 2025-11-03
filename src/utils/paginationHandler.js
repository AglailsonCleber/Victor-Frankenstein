// src/utils/paginationHandler.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionType } = require('discord.js');
const {
    searchMovieByTitle,
    searchTvByTitle,
    searchPersonByName,
    discoverByGenre
} = require('../services/api_tmdb');

// --- IDs Genéricos (não mudam) ---
const PREV_RESULT_ID = 'page_prev_res';
const NEXT_RESULT_ID = 'page_next_res';
const PREV_PAGE_ID = 'page_prev_page';
const NEXT_PAGE_ID = 'page_next_page';
const FINISH_BUTTON_ID = 'page_finish';

// --- Função Central de Busca (Sem Alterações) ---
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

// --- Função Central de Formatação (CORRIGIDA) ---
function formatEmbedAndContent(searchType, item, currentIndex, totalResults, currentPage, totalPages) {
    let embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setFooter({ text: 'Fonte: The Movie Database (TMDB)' })
        .setTimestamp();
    let content = `**Página: ${currentPage} de ${totalPages}**\n**🔎 Resultado ${currentIndex + 1} de ${totalResults}**\n\n`;

    // Função auxiliar para formatar com segurança
    const formatVoteAverage = (value) => {
        const num = parseFloat(value);
        return isNaN(num) || num === 0 ? 'N/A' : `${num.toFixed(2)}/10`;
    };

    // Função auxiliar para formatar votos com segurança
    const formatVoteCount = (value) => {
        const num = parseInt(value);
        return isNaN(num) ? 'N/A' : String(num);
    };

    const formatPopularity = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? 'N/A' : num.toFixed(2);
    };

    switch (searchType) {
        case 'movie':
            embed.setTitle(`🎬 ${item.title} (${item.releaseDate ? item.releaseDate.substring(0, 4) : 'N/A'})`)
                .setDescription(`**Sinopse:**\n${item.overview.substring(0, 400) + (item.overview.length > 400 ? '...' : '')}`)
                .setImage(item.posterUrl)
                .addFields(
                    // Dados Principais
                    { name: 'Título Original', value: item.originalTitle || 'N/A', inline: true },
                    { name: 'Idioma Original', value: item.originalLanguage ? item.originalLanguage.toUpperCase() : 'N/A', inline: true },
                    { name: 'Status Adulto', value: item.adult ? 'Sim 🔞' : 'Não', inline: true },

                    { name: 'ID (TMDB)', value: item.id ? String(item.id) : 'N/A', inline: true },
                    { name: 'Popularidade', value: formatPopularity(item.popularity), inline: true },
                    { name: 'Data de Lançamento', value: item.releaseDate || 'N/A', inline: true },

                    // Dados de Votação (CORRIGIDO AQUI)
                    { name: '⭐ Média de Votos', value: formatVoteAverage(item.voteAverage), inline: true },
                    { name: 'Contagem de Votos', value: formatVoteCount(item.voteCount), inline: true },
                    // Separador para Trailer
                    { name: 'Trailer Disponível?', value: item.video ? 'Sim' : 'Não', inline: true }
                );
            content += `**Backdrop Path:** \`${item.backdrop_path || 'N/A'}\``;
            break;
        case 'tv':
            // Aplicando a mesma correção para TV
            embed.setTitle(`📺 ${item.title}`)
                .setDescription(`**Sinopse:**\n${item.overview.substring(0, 400) + (item.overview.length > 400 ? '...' : '')}`)
                .setImage(item.posterUrl)
                .addFields(
                    { name: 'Título Original', value: item.originalTitle || 'N/A', inline: true },
                    { name: 'Idioma Original', value: item.originalLanguage ? item.originalLanguage.toUpperCase() : 'N/A', inline: true },
                    { name: 'Data de Lançamento', value: item.releaseDate || 'N/A', inline: true },

                    { name: 'Popularidade', value: formatPopularity(item.popularity), inline: true },
                    { name: '⭐ Média de Votos', value: formatVoteAverage(item.voteAverage), inline: true },
                    { name: 'Contagem de Votos', value: formatVoteCount(item.voteCount), inline: true }
                );
            content += `**ID TMDB:** ${item.id}\n`;
            break;
        case 'person':
            embed.setTitle(`👤 ${item.title}`)
                .setDescription(`**🎬 Departamento:** ${item.department}\n**⭐ Conhecido(a) por:** ${item.knownFor.substring(0, 500)}`)
                .setThumbnail(item.posterUrl);
            content += `**ID TMDB:** ${item.id}\n**Popularidade:** ${formatPopularity(item.popularity)}`;
            break;
    }
    return { content, embed };
}

// ... (O restante da função startPagination e os listeners permanecem inalterados)

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
        // Mantém a efemeridade se a interação original for efêmera.
        await interaction.deferReply({ ephemeral: interaction.ephemeral || false });
    }

    try {
        let currentPage = 1;
        let apiResults = [];
        let totalPages = 1;
        let currentResultIndex = 0;

        // --- Função Central para Buscar e Atualizar o Estado ---
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

        // --- Função para Renderizar a Mensagem ---
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

        // --- Collector e Listeners ---
        const filter = i => i.user.id === interaction.user.id;
        // Tempo de 15 minutos (900.000 ms)
        const collector = reply.createMessageComponentCollector({ filter, time: 900000 });

        collector.on('collect', async i => {
            // Adia a atualização da interação do botão
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

            await i.editReply(newRender); // Edita a resposta usando a interação do botão
        });

        // --- ROTINA DE FINALIZAÇÃO (CONGELA OS BOTÕES) ---
        collector.on('end', async (collected, reason) => {
            // Pega o último estado para manter o Embed
            const finalState = renderMessage(apiResults[currentResultIndex], currentResultIndex, apiResults.length, currentPage, totalPages);

            // Mapeia os componentes e DESATIVA (CONGELA) TODOS OS BOTÕES
            const disabledComponents = finalState.components.map(row =>
                new ActionRowBuilder().addComponents(
                    row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
                )
            );

            // Edita a resposta original (a da paginação)
            await interaction.editReply({
                // Texto que informa o motivo da finalização
                content: (reason === 'finished_by_user') ? '✅ Busca finalizada.' : 'Tempo esgotado. Busca finalizada.',
                embeds: finalState.embeds,
                components: disabledComponents // Aplica os botões congelados
            }).catch(() => {
                // Catch para lidar com o erro de token de interação expirado
                console.warn('Não foi possível editar a mensagem final, o token de interação expirou.');
            });
        });

    } catch (error) {
        console.error(`Erro na paginação (Tipo: ${searchType}, Modo: ${searchMode}, Query: "${query}"):`, error);
        const errorMessage = `❌ Ocorreu um erro ao processar a busca. Detalhe: ${error.message}`;
        if (interaction.deferred || interaction.replied) {
            // Edita a resposta efêmera ou normal com o erro
            await interaction.editReply({ content: errorMessage, ephemeral: true, embeds: [], components: [] });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true, embeds: [], components: [] });
        }
    }
}

module.exports = { startPagination };