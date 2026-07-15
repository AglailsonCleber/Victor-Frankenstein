// src/utils/paginationHandler.js (ES Module)

import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    InteractionType, // Importado corretamente
} from "discord.js";
import {
    searchMovieByTitle,
    searchTvByTitle,
    searchPersonByName,
    discoverByGenre,
    getWatchProviders,
} from "../services/api_tmdb.js";

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

// --- CONFIGURAÇÃO ---
const TIMEOUT_DURATION = 10 * 60 * 1000; // 10 minutos
const MAX_RESULTS_PER_PAGE = 20;

// ------------------------------------------------------------------------------------------------------
// FUNÇÕES AUXILIARES DE RENDERIZAÇÃO
// ------------------------------------------------------------------------------------------------------

/**
 * Mapeia o tipo de busca para a função de serviço correspondente.
 * @param {string} searchType 'movie', 'tv', 'person', 'genre'
 */
function getSearchFunction(searchType, searchMode) {
    if (searchMode === 'genre') {
        return discoverByGenre;
    }
    switch (searchType) {
        case "movie":
            return searchMovieByTitle;
        case "tv":
            return searchTvByTitle;
        case "person":
            return searchPersonByName;
        default:
            throw new Error(`Tipo de busca inválido: ${searchType}`);
    }
}

/**
 * Constrói o Embed com os dados da TMDB e os botões de navegação.
 * @param {Object} data O objeto de dados da API TMDB.
 * @param {number} currentResultIndex Índice do resultado atual (0 a 19).
 * @param {number} currentPage Página atual da API.
 * @param {string} searchType 'movie', 'tv', ou 'person'.
 * @returns {{embeds: EmbedBuilder[], components: ActionRowBuilder[]}} Embed e Componentes prontos.
 */
function buildEmbedAndComponents(data, currentResultIndex, currentPage, searchType) {
    const totalPages = data.total_pages;
    const totalResults = data.total_results;
    const result = data.results[currentResultIndex];

    if (!result) {
        // Isso não deve acontecer se a lógica de navegação estiver correta.
        const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription("❌ Nenhum resultado válido encontrado nesta posição.");
        return {
            embeds: [errorEmbed],
            components: [],
        };
    }

    const isMovieOrTv = searchType === 'movie' || searchType === 'tv';
    const isPerson = searchType === 'person';
    const releaseDate = result.release_date || result.first_air_date || 'N/A';
    const title = result.title || result.name;
    const overview = result.overview || result.biography || 'Sem descrição disponível.';
    const imageUrl = result.poster_path || result.profile_path ? `https://image.tmdb.org/t/p/w500${result.poster_path || result.profile_path}` : null;
    const genreNames = result.genre_ids ? result.genre_ids.map(id => `*ID: ${id}*`).join(', ') : 'N/A';

    // Calcula o índice global para o rodapé
    const globalResultIndex = (currentPage - 1) * MAX_RESULTS_PER_PAGE + (currentResultIndex + 1);

    const embed = new EmbedBuilder()
        .setColor(isMovieOrTv ? 0x0099ff : 0x00ff99)
        .setTitle(`[${isMovieOrTv ? title : result.name}] Pesquisa TMDB ${isMovieOrTv ? '🎬' : '👤'}`)
        .setDescription(overview.length > 500 ? overview.substring(0, 500) + '...' : overview)
        .setThumbnail(imageUrl)
        .addFields(
            { name: isMovieOrTv ? '📅 Lançamento' : '📚 Conhecido por', value: isMovieOrTv ? releaseDate : result.known_for_department || 'N/A', inline: true },
            { name: isMovieOrTv ? '⭐ Nota' : 'Popularidade', value: `${result.vote_average || result.popularity || 'N/A'}`, inline: true },
        )
        .setFooter({
            text: `Resultado ${globalResultIndex}/${totalResults} | Página ${currentPage}/${totalPages}.`,
        });

    if (isMovieOrTv && genreNames !== 'N/A') {
        embed.addFields(
            { name: '🏷️ Gêneros (IDs)', value: genreNames, inline: false },
        );
    }

    // --- Criação dos Botões de Navegação ---
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(PREV_RESULT_ID)
                .setLabel("⬅️ Resultado")
                .setStyle(ButtonStyle.Secondary)
                // Desabilitado se for o primeiro resultado da primeira página
                .setDisabled(globalResultIndex === 1),

            new ButtonBuilder()
                .setCustomId(NEXT_RESULT_ID)
                .setLabel("Resultado ➡️")
                .setStyle(ButtonStyle.Secondary)
                // Desabilitado se for o último resultado da última página
                .setDisabled(globalResultIndex === totalResults),

            new ButtonBuilder()
                .setCustomId(FINISH_BUTTON_ID)
                .setLabel("Finalizar Busca")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🛑"),
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(PREV_PAGE_ID)
                .setLabel('⏪ Página')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 1),

            new ButtonBuilder()
                .setCustomId(BTN_ID_JUMP_TO_PAGE)
                .setLabel(`Pular para ${currentPage}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(totalPages <= 1),

            new ButtonBuilder()
                .setCustomId(NEXT_PAGE_ID)
                .setLabel('Página ⏩')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === totalPages),
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            // Botão "Onde Assistir" só para filmes/séries
            new ButtonBuilder()
                .setCustomId(BTN_ID_PROVIDERS)
                .setLabel("Onde Assistir")
                .setStyle(ButtonStyle.Success)
                .setDisabled(!isMovieOrTv) // Desabilita se for busca de Pessoa
                .setEmoji("🌐"),

            // Botão "Publicar" (para transformar a ephemeral em pública)
            new ButtonBuilder()
                .setCustomId(BTN_ID_PUBLISH)
                .setLabel("Publicar")
                .setStyle(ButtonStyle.Success)
                .setEmoji("📣"),
        );

    return {
        embeds: [embed],
        components: [row1, row2, row3],
    };
}

// ------------------------------------------------------------------------------------------------------
// FUNÇÃO PRINCIPAL DE INÍCIO DA PAGINAÇÃO
// ------------------------------------------------------------------------------------------------------

/**
 * Inicia o processo de paginação interativa para os resultados da busca.
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').ModalSubmitInteraction | import('discord.js').StringSelectMenuInteraction} interaction A interação inicial (de slash ou modal).
 * @param {string} query O termo de busca ou ID do gênero.
 * @param {string} searchType 'movie', 'tv', ou 'person'.
 * @param {string} [searchMode='title'] 'title' para busca por título/nome, ou 'genre' para descoberta por gênero.
 */
export async function startPagination(interaction, query, searchType, searchMode = 'title') {

    // --- 1. Estado Inicial ---
    let currentPage = 1;
    let currentResultIndex = 0;

    let searchFunction = getSearchFunction(searchType, searchMode);

    let tmdbData;
    let firstReply;

    try {
        // 2. Busca inicial
        tmdbData = await searchFunction(query, currentPage);

        if (!tmdbData || tmdbData.total_results === 0) {
            // A interação inicial já deve estar deferida pelo interactionCreate.js
            return interaction.editReply({
                content: `❌ Não foram encontrados resultados para a busca: **${query}**`,
                ephemeral: true,
            });
        }

        // 3. Renderiza a primeira página
        const initialState = buildEmbedAndComponents(tmdbData, currentResultIndex, currentPage, searchType);

        // A interação inicial já está deferida (await interaction.deferReply() em interactionCreate.js)
        firstReply = await interaction.editReply({
            content: `Pesquisa por ${searchMode === 'genre' ? 'Gênero' : 'Título'} iniciada!`,
            embeds: initialState.embeds,
            components: initialState.components,
            ephemeral: true, // Mantém a busca privada por padrão
        });

    } catch (error) {
        console.error(`Erro na busca inicial (Query: ${query}):`, error);
        return interaction.editReply({
            content: `❌ Ocorreu um erro na busca inicial: ${error.message}`,
            ephemeral: true,
        });
    }

    // ------------------------------------------------------------------------------------------------------
    // COLLECTOR DE INTERAÇÕES (O Coração da Paginação)
    // ------------------------------------------------------------------------------------------------------

    // Filtro para aceitar apenas interações de botões e modais do usuário original e IDs corretos
    const filter = (i) => {
        // Apenas do usuário original
        if (i.user.id !== interaction.user.id) {
            i.reply({ content: "Você não iniciou esta busca!", ephemeral: true });
            return false;
        }
        // Apenas botões de navegação ou modais
        return i.customId &&
            (i.customId.startsWith("page_") ||
                i.customId === FINISH_BUTTON_ID ||
                i.customId === BTN_ID_JUMP_TO_PAGE ||
                i.customId === BTN_ID_PROVIDERS ||
                i.customId === BTN_ID_PUBLISH ||
                i.customId === MODAL_ID_JUMP);
    };

    // Cria o coletor de componentes para a mensagem
    const collector = firstReply.createMessageComponentCollector({
        filter,
        time: TIMEOUT_DURATION,
        // idle: 5 * 60 * 1000, 
    });

    // Função para atualizar e enviar a nova mensagem
    const updateMessage = async (i) => {
        const newState = buildEmbedAndComponents(tmdbData, currentResultIndex, currentPage, searchType);
        // CORREÇÃO: Usamos editReply porque a interação (i) é deferida
        await i.editReply(newState);
    };

    // --- Lógica de Interação ---
    collector.on("collect", async (i) => {
        // Garante que a interação de componente seja deferida (para dar tempo de processar)
        if (i.isMessageComponent() && !i.deferred && !i.replied) {
            await i.deferUpdate();
        }

        let shouldUpdate = false;

        // A. Botões de Navegação de Resultado (Próximo/Anterior)
        if (i.customId === NEXT_RESULT_ID || i.customId === PREV_RESULT_ID) {

            // Verifica se está no limite do array (MAX_RESULTS_PER_PAGE é o tamanho do array results)
            if (i.customId === NEXT_RESULT_ID && currentResultIndex < tmdbData.results.length - 1) {
                currentResultIndex++;
                shouldUpdate = true;
            } else if (i.customId === PREV_RESULT_ID && currentResultIndex > 0) {
                currentResultIndex--;
                shouldUpdate = true;
            } else {
                // Nenhuma ação, pois está no limite
            }

            // B. Botões de Navegação de Página (Próxima/Anterior)
        } else if (i.customId === NEXT_PAGE_ID || i.customId === PREV_PAGE_ID) {

            let newPage = currentPage;
            if (i.customId === NEXT_PAGE_ID && currentPage < tmdbData.total_pages) {
                newPage++;
            } else if (i.customId === PREV_PAGE_ID && currentPage > 1) {
                newPage--;
            }

            // Só faz a chamada da API se a página mudou
            if (newPage !== currentPage) {
                currentPage = newPage;
                currentResultIndex = 0; // Volta para o primeiro resultado da nova página

                // Recarrega os dados da API para a nova página
                tmdbData = await searchFunction(query, currentPage);
                shouldUpdate = true;
            }

            // C. Botão Pular para Página (Abre Modal)
        } else if (i.customId === BTN_ID_JUMP_TO_PAGE) {
            const modal = new ModalBuilder()
                .setCustomId(MODAL_ID_JUMP)
                .setTitle(`Pular para Página (1 - ${tmdbData.total_pages})`);

            const pageInput = new TextInputBuilder()
                .setCustomId(MODAL_INPUT_ID_JUMP)
                .setLabel('Número da Página')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: 5')
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(pageInput);
            modal.addComponents(row);

            // Responde à interação do botão abrindo o modal
            // i.showModal() é a resposta para o botão, NÃO precisa de deferUpdate antes
            await i.showModal(modal);
            return; // Interrompe para não fazer update desnecessário

            // D. Botão Onde Assistir (Providers)
        } else if (i.customId === BTN_ID_PROVIDERS) {
            // Garante que o estado está correto
            const currentItem = tmdbData.results[currentResultIndex];
            if (currentItem) {
                // Chama a função da API para buscar os provedores
                const providerEmbed = await getWatchProviders(searchType, currentItem.id, currentItem.title || currentItem.name);

                // Edita a mensagem para mostrar o embed de provedores
                await i.editReply({
                    content: '🌐 Informações de Streaming:',
                    embeds: [providerEmbed],
                    // Mantém os botões da paginação para voltar
                    components: firstReply.components,
                });
            }
            return; // Interrompe para não fazer update desnecessário

            // E. Botão Publicar
        } else if (i.customId === BTN_ID_PUBLISH) {
            // Torna a mensagem pública e a finaliza
            const currentState = buildEmbedAndComponents(tmdbData, currentResultIndex, currentPage, searchType);

            await i.channel.send({
                content: `A pedido de ${i.user}, aqui está:`,
                embeds: currentState.embeds,
            });
            // i.editReply() é usado, pois a interação já foi deferida (i.deferUpdate)
            await i.editReply({
                content: `✅ Resultado publicado por ${i.user}:`,
                embeds: currentState.embeds,
                components: [], // Remove os botões de navegação
                ephemeral: false, // Torna pública
            });
            collector.stop('finished_by_user'); // Finaliza a busca
            return;

            // F. Botão Finalizar
        } else if (i.customId === FINISH_BUTTON_ID) {
            collector.stop("finished_by_user");
            return;

        }

        // Se houve alteração de página ou resultado, atualiza a mensagem
        if (shouldUpdate) {
            // i.editReply() é chamado dentro de updateMessage()
            await updateMessage(i);
        }
    });

    // --- Lógica de Finalização ---
    collector.on("end", async (collected, reason) => {
        const finalState = buildEmbedAndComponents(tmdbData, currentResultIndex, currentPage, searchType);

        // Desabilita todos os botões na mensagem final
        const disabledComponents = finalState.components.map((row) =>
            ActionRowBuilder.from(row).setComponents(
                row.components.map((button) =>
                    ButtonBuilder.from(button).setDisabled(true)
                )
            )
        );

        // Edita a mensagem para a versão final/desabilitada
        await interaction
            .editReply({
                content:
                    reason === "finished_by_user"
                        ? "✅ Busca finalizada."
                        : "Tempo esgotado. Busca finalizada.",
                embeds: [],
                components: disabledComponents,
            })
            .catch(() => {
                // Captura se o token de interação tiver expirado antes do editReply final
                console.warn(
                    "Não foi possível editar a mensagem final, o token de interação expirou."
                );
            });
    });
}