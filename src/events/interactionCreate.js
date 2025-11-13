// src/events/interactionCreate.js (Corrigido para o Handler ESM + Player de Música)

import { 
    InteractionType, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    Events, 
    TextChannel // Importar TextChannel para type check
} from 'discord.js'; 

// Handlers e Serviços existentes
import { startPagination } from '../utils/paginationHandler.js'; 
import { getGenreList } from '../services/api_tmdb.js'; 

// Handlers e Serviços NOVOS (Player de Música)
import QueueManager from '../services/QueueManager.js'; 
import { generatePlayerEmbed } from '../utils/generatePlayerEmbed.js'; 

// --- IDs ÚNICOS para todos os nossos componentes ---
const MENU_ID_MAIN = 'menu_select_search_type';
const BTN_ID_SEARCH_BY_TITLE = 'btn_search_by_title_'; 
const BTN_ID_SEARCH_BY_GENRE = 'btn_search_by_genre_'; 
const MENU_ID_GENRE_SELECT = 'menu_select_genre_'; 
const MODAL_ID_PREFIX = 'menu_modal_'; 
const MODAL_INPUT_ID = 'search_query_input';

// NOVOS IDs para o Player de Música (Mapeados em generatePlayerEmbed.js)
const PLAYER_BTN_PREFIX = 'player_'; 

// --- EXPORTAÇÃO DE DADOS PARA O HANDLER ---
export const data = {
    name: Events.InteractionCreate,
    once: false,
};

// --- FUNÇÃO DE EXECUÇÃO ---
export async function execute(interaction) {
    // ------------------------------------------
    // 1. DISPATCHER DE COMANDOS DE BARRA (SLASH)
    // ------------------------------------------
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.slashCommands.get(interaction.commandName);

        if (!command) {
            console.error(`Comando /${interaction.commandName} não encontrado.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ 
                    content: '❌ Ocorreu um erro ao executar este comando!', 
                    ephemeral: true 
                }).catch(() => {});
            } else {
                await interaction.reply({ 
                    content: '❌ Ocorreu um erro ao executar este comando!', 
                    ephemeral: true 
                }).catch(() => {});
            }
        }
    }

    // ----------------------------------------------------------------------------------
    // 2. DISPATCHER DE BOTÕES E MENUS (Componentes de Mensagem)
    // ----------------------------------------------------------------------------------
    else if (interaction.isButton() || interaction.isAnySelectMenu()) {
        const customId = interaction.customId;

        // ---------------- A. Handler de Componentes de MÚSICA ----------------
        if (customId.startsWith(PLAYER_BTN_PREFIX)) {
            const guildId = interaction.guildId;
            // Assumindo que client.queueManagers existe e armazena os QueueManager
            const player = interaction.client.queueManagers?.get(guildId); 

            if (!player || !player.isPlayerActive()) {
                // Se o player não estiver ativo, desabilita a interação.
                return interaction.update({ components: [] }).catch(() => interaction.reply({ content: '❌ O player não está mais ativo neste servidor.', ephemeral: true }));
            }
            
            // Procura o método correspondente ao ID do botão
            const command = customId.replace(PLAYER_BTN_PREFIX, ''); // ex: 'skip', 'pause_resume'
            let response = null;

            // Executa a lógica de controle
            if (command === 'skip') {
                player.playNext(); // Chama playNext para pular a faixa atual
            } else if (command === 'pause_resume') {
                response = player.togglePauseResume();
            } else if (command === 'stop') {
                player.stop(); // Interrompe e destroi a conexão
                interaction.client.queueManagers.delete(guildId); // Remove o gerenciador
                await interaction.update({ content: '🛑 Reprodução encerrada.', embeds: [], components: [] });
                return;
            } else if (command === 'loop') {
                response = player.toggleLoop();
            } else if (command === 'shuffle') {
                response = player.toggleShuffle();
            } else if (command === 'queue') {
                // Comando especial que não usa update, apenas reply efêmero
                const queueList = player.getQueueList();
                await interaction.reply({ content: queueList, ephemeral: true });
                return;
            }

            // Se houve uma resposta de string (ex: toggleLoop), envia como efêmera
            if (response && typeof response === 'string') {
                await interaction.reply({ content: response, ephemeral: true });
            }

            // Atualiza a mensagem do player após a ação
            await interaction.update(generatePlayerEmbed(player));
        }
        // ---------------- B. Handler de Componentes de TMDB (Filmes/Séries) ----------------
        else if (customId === MENU_ID_MAIN) {
            // Handler para o Menu Principal de Pesquisa (pesquisarFilmesSeries.js)
            const type = interaction.values[0]; // 'movie', 'tv', ou 'person'

            // Se for pessoa, inicia a paginação imediatamente (só busca por título)
            if (type === 'person') {
                await interaction.deferUpdate();
                const modal = new ModalBuilder()
                    .setCustomId(MODAL_ID_PREFIX + 'person')
                    .setTitle('Buscar Pessoa (Ator/Diretor)');

                const nameInput = new TextInputBuilder()
                    .setCustomId(MODAL_INPUT_ID)
                    .setLabel('Nome da Pessoa')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
                modal.addComponents(firstActionRow);

                await interaction.showModal(modal);
                return; // O restante da lógica de 'person' está no ModalSubmit
            }

            // Para Filme/Série, apresenta a próxima escolha (Título ou Gênero)
            const titleButton = new ButtonBuilder()
                .setCustomId(BTN_ID_SEARCH_BY_TITLE + type)
                .setLabel('Buscar por Título')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔎');

            const genreButton = new ButtonBuilder()
                .setCustomId(BTN_ID_SEARCH_BY_GENRE + type)
                .setLabel('Buscar por Gênero')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗂️');

            const row = new ActionRowBuilder().addComponents(titleButton, genreButton);

            await interaction.update({
                content: `Opções de Pesquisa para ${type === 'movie' ? 'Filmes' : 'Séries'}:`,
                embeds: [], // Remove o embed do menu principal
                components: [row],
            });
        }
        
        // Handler para o botão 'Buscar por Título' (Abre o Modal)
        else if (customId.startsWith(BTN_ID_SEARCH_BY_TITLE)) {
            const type = customId.replace(BTN_ID_SEARCH_BY_TITLE, ''); // 'movie' ou 'tv'
            
            const modal = new ModalBuilder()
                .setCustomId(MODAL_ID_PREFIX + type)
                .setTitle(`Buscar ${type === 'movie' ? 'Filme' : 'Série'} por Título`);

            const titleInput = new TextInputBuilder()
                .setCustomId(MODAL_INPUT_ID)
                .setLabel('Título da Mídia')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);
        }

        // Handler para o botão 'Buscar por Gênero' (Abre o Menu de Seleção de Gêneros)
        else if (customId.startsWith(BTN_ID_SEARCH_BY_GENRE)) {
            await interaction.deferUpdate(); // Defer para obter os dados da API sem timeout

            const type = customId.replace(BTN_ID_SEARCH_BY_GENRE, ''); // 'movie' ou 'tv'

            try {
                // Chama o serviço TMDB para obter a lista de gêneros
                const genres = await getGenreList(type);

                const options = genres.map(genre => ({
                    label: genre.name,
                    description: `Buscar ${type === 'movie' ? 'Filmes' : 'Séries'} com este gênero.`,
                    value: genre.id.toString(), 
                }));

                const genreMenu = new StringSelectMenuBuilder()
                    .setCustomId(`${MENU_ID_GENRE_SELECT}${type}`) 
                    .setPlaceholder('Selecione um gênero...')
                    .addOptions(options.slice(0, 25)); 

                const row = new ActionRowBuilder().addComponents(genreMenu);
                
                await interaction.editReply({
                    content: `Selecione um gênero para ${type === 'movie' ? 'Filmes' : 'Séries'}:`,
                    components: [row],
                });

            } catch (error) {
                console.error("Erro ao buscar gêneros:", error);
                await interaction.editReply({ content: '❌ Erro ao buscar a lista de gêneros na API.', components: [] });
            }
        }
    }

    // --- 3. Handler para Envios de Formulário (Modal) e Outras Interações ---
    else if (interaction.isModalSubmit()) {
        
        // Lógica de Submissão de Modal para Pesquisa por Título (TMDB)
        if (interaction.customId.startsWith(MODAL_ID_PREFIX)) {
            await interaction.deferReply({ ephemeral: true }); 

            const searchType = interaction.customId.replace(MODAL_ID_PREFIX, ''); 
            const searchQuery = interaction.fields.getTextInputValue(MODAL_INPUT_ID);

            console.log(`[EVENT] ⚙️ Modal Submit (Título): Tipo=${searchType}, Busca="${searchQuery}"`);

            // Inicia o processo de paginação com o resultado da busca
            await startPagination(interaction, searchQuery, searchType, 'title');
        }
        
        // (Aqui viria o handler para o Modal de "Pular Página" do paginationHandler.js)
        // ...
    }
    
    // ----------------------------------------------------------------------------------
    // 4. Handler de Paginação (Gênero)
    // ----------------------------------------------------------------------------------
    // Deve ser um Select Menu que inicia a paginação (e não apenas o menu principal)
    else if (interaction.isStringSelectMenu() && interaction.customId.startsWith(MENU_ID_GENRE_SELECT)) {
        await interaction.deferReply({ ephemeral: true });

        const searchType = interaction.customId.replace(MENU_ID_GENRE_SELECT, ''); // 'movie' ou 'tv'
        const genreId = interaction.values[0]; // ID do gênero

        console.log(`[EVENT] ⚙️ Select Menu (Gênero): Tipo=${searchType}, Gênero ID="${genreId}"`);

        // Inicia o processo de paginação com o ID do gênero
        // Passa o ID do gênero como 'query' e o modo como 'genre'
        await startPagination(interaction, genreId, searchType, 'genre');
    }

    // ----------------------------------------------------------------------------------
    // 5. Outras interações (Select Menus e Botões de Paginação/Player)
    // ----------------------------------------------------------------------------------
    // Todas as outras interações (botões de paginação, etc.) seriam tratadas aqui
    // Se o customId for tratado no paginationHandler.js, ele deve ser chamado aqui.
    // Exemplo: if (customId.startsWith('page_')) { paginationHandler.handle(interaction); }
    // A complexidade indica que o paginationHandler.js lida com os botões internos de paginação.
}