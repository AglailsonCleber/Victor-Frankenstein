// src/utils/paginationHandler.js (ES Module)

import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    InteractionType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js"; // Mudar require('discord.js') para import
import {
    searchMovieByTitle,
    searchTvByTitle,
    searchPersonByName,
    discoverByGenre,
    getWatchProviders,
} from "../services/api_tmdb.js"; // Mudar require e ADICIONAR .js

// --- IDs Genéricos (não mudam) ---
const PREV_RESULT_ID = "page_prev_res";
const NEXT_RESULT_ID = "page_next_res";
const PREV_PAGE_ID = "page_prev_page";
const NEXT_PAGE_ID = "page_next_page";
const FINISH_BUTTON_ID = "page_finish";

// --- (NOVOS) IDs para as novas funcionalidades ---
const BTN_ID_JUMP_TO_PAGE = "btn_jump_to_page";
const BTN_ID_PROVIDERS = "btn_providers";
const BTN_ID_PUBLISH = "btn_publish";

// --- (NOVOS) IDs para o Modal de "Pular Página" ---
const MODAL_ID_JUMP = "modal_jump_to_page";
const MODAL_INPUT_ID_JUMP = "modal_input_jump";

// --- Função Central de Busca (Seu código, mantido) ---
async function fetchData(searchType, query, page, searchMode) {
    if (searchMode === "genre") {
        return discoverByGenre(searchType, query, page);
    }
    switch (searchType) {
        case "movie":
            return searchMovieByTitle(query, page);
        case "tv":
            return searchTvByTitle(query, page);
        case "person":
            return searchPersonByName(query, page);
        default:
            throw new Error("Tipo de busca inválido.");
    }
}

// --- Função Central de Formatação (SEU CÓDIGO MELHORADO, MANTIDO!) ---
function formatEmbedAndContent(
    searchType,
    item,
    currentIndex,
    totalResults,
    currentPage,
    totalPages
) {
    let embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setFooter({ text: "Fonte: The Movie Database (TMDB)" })
        .setTimestamp();
    let content = `**Página: ${currentPage} de ${totalPages}**\n**🔎 Resultado ${currentIndex + 1
        } de ${totalResults}**\n\n`; // Suas funções auxiliares de formatação (PERFEITAS!)

    const formatVoteAverage = (value) => {
        const num = parseFloat(value);
        return isNaN(num) || num === 0 ? "N/A" : `${num.toFixed(2)}/10`;
    };
    const formatVoteCount = (value) => {
        const num = parseInt(value);
        return isNaN(num) ? "N/A" : String(num);
    };
    const formatPopularity = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? "N/A" : num.toFixed(2);
    };

    switch (searchType) {
        case "movie":
            embed
                .setTitle(
                    `🎬 ${item.title} (${item.releaseDate ? item.releaseDate.substring(0, 4) : "N/A"
                    })`
                )
                .setDescription(
                    `**Sinopse:**\n${item.overview.substring(0, 400) +
                    (item.overview.length > 400 ? "..." : "")
                    }`
                )
                .setImage(item.posterUrl)
                .addFields(
                    {
                        name: "Título Original",
                        value: item.originalTitle || "N/A",
                        inline: true,
                    },
                    {
                        name: "Idioma Original",
                        value: item.originalLanguage
                            ? item.originalLanguage.toUpperCase()
                            : "N/A",
                        inline: true,
                    },
                    {
                        name: "Status Adulto",
                        value: item.adult ? "Sim 🔞" : "Não",
                        inline: true,
                    },
                    {
                        name: "ID (TMDB)",
                        value: item.id ? String(item.id) : "N/A",
                        inline: true,
                    },
                    {
                        name: "Popularidade",
                        value: formatPopularity(item.popularity),
                        inline: true,
                    },
                    {
                        name: "Data de Lançamento",
                        value: item.releaseDate || "N/A",
                        inline: true,
                    },
                    {
                        name: "⭐ Média de Votos",
                        value: formatVoteAverage(item.voteAverage),
                        inline: true,
                    },
                    {
                        name: "Contagem de Votos",
                        value: formatVoteCount(item.voteCount),
                        inline: true,
                    },
                    {
                        name: "Trailer Disponível?",
                        value: item.video ? "Sim" : "Não",
                        inline: true,
                    }
                ); // content += `**Backdrop Path:** \`${item.backdrop_path || 'N/A'}\``;
            break;
        case "tv":
            embed
                .setTitle(`📺 ${item.title}`)
                .setDescription(
                    `**Sinopse:**\n${item.overview.substring(0, 400) +
                    (item.overview.length > 400 ? "..." : "")
                    }`
                )
                .setImage(item.posterUrl)
                .addFields(
                    {
                        name: "Título Original",
                        value: item.originalTitle || "N/A",
                        inline: true,
                    },
                    {
                        name: "Idioma Original",
                        value: item.originalLanguage
                            ? item.originalLanguage.toUpperCase()
                            : "N/A",
                        inline: true,
                    },
                    {
                        name: "Data de Lançamento",
                        value: item.releaseDate || "N/A",
                        inline: true,
                    },
                    {
                        name: "Popularidade",
                        value: formatPopularity(item.popularity),
                        inline: true,
                    },
                    {
                        name: "⭐ Média de Votos",
                        value: formatVoteAverage(item.voteAverage),
                        inline: true,
                    },
                    {
                        name: "Contagem de Votos",
                        value: formatVoteCount(item.voteCount),
                        inline: true,
                    }
                );
            content += `**ID TMDB:** ${item.id}\n`;
            break;
        case "person":
            embed
                .setTitle(`👤 ${item.title}`)
                .setDescription(
                    `**🎬 Departamento:** ${item.department
                    }\n**⭐ Conhecido(a) por:** ${item.knownFor.substring(0, 500)}`
                )
                .setThumbnail(item.posterUrl);
            content += `**ID TMDB:** ${item.id}\n**Popularidade:** ${formatPopularity(
                item.popularity
            )}`;
            break;
    }
    return { content, embed };
}

/**
 * Inicia a interface de paginação para qualquer tipo de busca.
 */
export async function startPagination(
    interaction,
    query,
    searchType,
    searchMode = "title"
) {
    // Adicionar export
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: interaction.ephemeral || false });
    }

    try {
        let currentPage = 1;
        let apiResults = [];
        let totalPages = 1;
        let currentResultIndex = 0; // --- Função Central para Buscar e Atualizar o Estado (Seu código, mantido) ---

        const fetchAndRender = async (pageToFetch) => {
            const data = await fetchData(searchType, query, pageToFetch, searchMode);

            apiResults = data.results; // Validação para garantir que current_page não é 0
            currentPage = data.current_page > 0 ? data.current_page : 1;
            totalPages = data.total_pages;

            if (pageToFetch !== currentPage) {
                currentResultIndex = 0;
            }

            if (apiResults.length === 0) {
                const errorQuery =
                    searchMode === "genre" ? `gênero ID ${query}` : `"${query}"`;
                throw new Error(`Nenhum resultado encontrado para: **${errorQuery}**.`);
            }

            return renderMessage(
                apiResults[currentResultIndex],
                currentResultIndex,
                apiResults.length,
                currentPage,
                totalPages
            );
        }; // --- Função para Renderizar a Mensagem (MODIFICADA) ---

        const renderMessage = (
            currentItem,
            currentIdx,
            totalResOnPage,
            currentPg,
            totalPg
        ) => {
            const isLastResultOnPage = currentIdx === totalResOnPage - 1;
            const isFirstPage = currentPg === 1;
            const isLastPage = currentPg === totalPg;
            const isPerson = searchType === "person"; // 1. Botões de Navegação de Resultados (Filmes/Séries/Pessoas na página)

            const resultNavRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(PREV_RESULT_ID)
                    .setLabel("⬅️ Anterior")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentIdx === 0),
                new ButtonBuilder()
                    .setCustomId(NEXT_RESULT_ID)
                    .setLabel("Próximo(a) ➡️")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(isLastResultOnPage)
            ); // 2. (NOVO) Botões de Detalhes e Publicação

            const detailsRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(BTN_ID_PROVIDERS)
                    .setLabel("Onde Assistir? 🍿")
                    .setStyle(ButtonStyle.Success) // Verde
                    .setDisabled(isPerson), // Desabilita se for pessoa
                new ButtonBuilder()
                    .setCustomId(BTN_ID_PUBLISH)
                    .setLabel("Publicar 📢")
                    .setStyle(ButtonStyle.Success) // Verde
            ); // 3. Botões de Navegação de Páginas (Páginas da API)
            const pageNavRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(PREV_PAGE_ID)
                    .setLabel("⏪ Pág. Anterior")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(isFirstPage),
                new ButtonBuilder()
                    .setCustomId(NEXT_PAGE_ID)
                    .setLabel("Pág. Próxima ⏩")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(isLastPage), // (NOVO) Botão "Pular Página"
                new ButtonBuilder()
                    .setCustomId(BTN_ID_JUMP_TO_PAGE)
                    .setLabel("Pular para... 🔀")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(totalPages <= 1) // Desabilita se só tem 1 página
            ); // 4. Botão Finalizar

            const finishRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(FINISH_BUTTON_ID)
                    .setLabel("✅ Finalizar Busca")
                    .setStyle(ButtonStyle.Danger)
            );

            const { content, embed } = formatEmbedAndContent(
                searchType,
                currentItem,
                currentIdx,
                totalResOnPage,
                currentPg,
                totalPg
            );

            return {
                content: content,
                embeds: [embed], // Retorna 4 fileiras de botões
                components: [resultNavRow, detailsRow, pageNavRow, finishRow],
            };
        }; // --- Inicializa a Busca (Seu código, mantido) ---

        const initialRender = await fetchAndRender(currentPage);
        const reply = await interaction.editReply(initialRender);

        if (totalPages === 0 || (totalPages === 1 && apiResults.length <= 1))
            return; // --- Collector e Listeners (MODIFICADO) ---

        const filter = (i) => i.user.id === interaction.user.id;
        const collector = reply.createMessageComponentCollector({
            filter,
            time: 900000,
        }); // 15 minutos

        collector.on("collect", async (i) => {
            const customId = i.customId; // --- LÓGICA DOS NOVOS BOTÕES --- // 1. (NOVO) Pular para Página

            if (customId === BTN_ID_JUMP_TO_PAGE) {
                const modal = new ModalBuilder()
                    .setCustomId(MODAL_ID_JUMP)
                    .setTitle("Pular para Página");
                const pageInput = new TextInputBuilder()
                    .setCustomId(MODAL_INPUT_ID_JUMP)
                    .setLabel(`Para qual página você quer pular? (1 - ${totalPages})`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Ex: 10")
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(pageInput));
                await i.showModal(modal); // Espera o usuário enviar o modal (1 minuto de tempo)

                const submitted = await i
                    .awaitModalSubmit({
                        filter: (mi) =>
                            mi.user.id === i.user.id && mi.customId === MODAL_ID_JUMP,
                        time: 60000,
                    })
                    .catch(() => null); // Retorna null se o tempo esgotar

                if (submitted) {
                    const pageStr =
                        submitted.fields.getTextInputValue(MODAL_INPUT_ID_JUMP);
                    const pageNum = parseInt(pageStr);

                    if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
                        // Dá um deferReply efêmero para a submissão do modal
                        await submitted.deferUpdate(); // Busca a nova página
                        const newRender = await fetchAndRender(pageNum); // Atualiza a mensagem original usando a interação do *modal*
                        await submitted.editReply(newRender);
                    } else {
                        // Dá um feedback efêmero sobre o erro
                        await submitted.reply({
                            content: `❌ Página inválida. O número deve estar entre 1 e ${totalPages}.`,
                            ephemeral: true,
                        });
                    }
                }
                return; // Impede que o código de paginação normal rode
            } // 2. (NOVO) Onde Assistir?

            if (customId === BTN_ID_PROVIDERS) {
                await i.deferReply({ ephemeral: true }); // Resposta só para o usuário
                const currentItem = apiResults[currentResultIndex];
                try {
                    const providerEmbed = await getWatchProviders(
                        searchType,
                        currentItem.id,
                        currentItem.title
                    );
                    await i.editReply({ embeds: [providerEmbed] });
                } catch (error) {
                    await i.editReply({
                        content: `❌ Erro ao buscar *Watch Providers*: ${error.message}`,
                    });
                }
                return; // Impede que o código de paginação normal rode
            } // 3. (NOVO) Publicar

            if (customId === BTN_ID_PUBLISH) {
                const currentItem = apiResults[currentResultIndex]; // Recria o embed e o content do item atual
                const { content, embed } = formatEmbedAndContent(
                    searchType,
                    currentItem,
                    currentResultIndex,
                    apiResults.length,
                    currentPage,
                    totalPages
                ); // Envia uma *nova* mensagem pública no canal
                await i.channel.send({
                    content: `A pedido de ${i.user}, aqui está:`,
                    embeds: [embed],
                }); // Dá um feedback efêmero para quem clicou
                await i.reply({
                    content: "✅ Resultado publicado no canal!",
                    ephemeral: true,
                });
                return; // Impede que o código de paginação normal rode
            } // --- LÓGICA ANTIGA (Paginação e Finalizar) ---

            await i.deferUpdate(); // Agora podemos dar o defer

            if (customId === FINISH_BUTTON_ID) {
                collector.stop("finished_by_user");
                return;
            }

            let shouldFetchNewPage = false;
            let pageToFetch = currentPage;

            if (
                customId === NEXT_RESULT_ID &&
                currentResultIndex < apiResults.length - 1
            ) {
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
                newRender = renderMessage(
                    apiResults[currentResultIndex],
                    currentResultIndex,
                    apiResults.length,
                    currentPage,
                    totalPages
                );
            }

            await i.editReply(newRender);
        }); // --- ROTINA DE FINALIZAÇÃO (Seu código, mantido) ---

        collector.on("end", async (collected, reason) => {
            const finalState = renderMessage(
                apiResults[currentResultIndex],
                currentResultIndex,
                apiResults.length,
                currentPage,
                totalPages
            );
            const disabledComponents = finalState.components.map((row) =>
                new ActionRowBuilder().addComponents(
                    row.components.map((button) =>
                        ButtonBuilder.from(button).setDisabled(true)
                    )
                )
            );
            await interaction
                .editReply({
                    content:
                        reason === "finished_by_user"
                            ? "✅ Busca finalizada."
                            : "Tempo esgotado. Busca finalizada.",
                    embeds: finalState.embeds,
                    components: disabledComponents,
                })
                .catch(() => {
                    console.warn(
                        "Não foi possível editar a mensagem final, o token de interação expirou."
                    );
                });
        });
    } catch (error) {
        console.error(
            `Erro na paginação (Tipo: ${searchType}, Modo: ${searchMode}, Query: "${query}"):`,
            error
        );
        const errorMessage = `❌ Ocorreu um erro ao processar a busca. Detalhe: ${error.message}`;
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({
                content: errorMessage,
                ephemeral: true,
                embeds: [],
                components: [],
            });
        } else {
            await interaction.reply({
                content: errorMessage,
                ephemeral: true,
                embeds: [],
                components: [],
            });
        }
    }
}
