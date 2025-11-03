// src/events/interactionCreate.js
const { 
    InteractionType, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');

// Handlers
const { startPagination } = require('../utils/paginationHandler'); 
const { getGenreList } = require('../services/api_tmdb'); // <-- Importamos o getGenreList

// --- IDs ÚNICOS para todos os nossos componentes ---

// Menu Principal
const MENU_ID_MAIN = 'menu_select_search_type';

// Botões (Novo fluxo)
const BTN_ID_SEARCH_BY_TITLE = 'btn_search_by_title_';   // Adicionaremos o tipo (movie/tv) no final
const BTN_ID_SEARCH_BY_GENRE = 'btn_search_by_genre_';   // Ex: btn_search_by_genre_movie

// Menu de Gêneros (Novo)
const MENU_ID_GENRE_SELECT = 'menu_select_genre_';      // Ex: menu_select_genre_movie

// Modal (Formulário)
const MODAL_ID_PREFIX = 'menu_modal_';                  // Ex: menu_modal_movie
const MODAL_INPUT_ID = 'search_query_input';


module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {

        // --- 1. Handler para Comandos de Barra (/) ---
        if (interaction.isChatInputCommand()) {
            console.log(`[EVENT] ⚙️ Slash Command: /${interaction.commandName} de ${interaction.user.tag}`);

            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return console.error(`[COMMAND ERROR] /${interaction.commandName} não encontrado.`);

            try {
                await command.execute(interaction);
                console.log(`[COMMAND] 🟢 /${interaction.commandName} executado.`);
            } catch (error) {
                console.error(`[COMMAND ERROR] 🔴 Erro ao executar /${interaction.commandName}:`, error);
                const errorMsg = 'Houve um erro ao tentar executar este comando!';
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMsg, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMsg, ephemeral: true });
                }
            }
        } 
        
        // --- 2. Handler para Menus de Seleção (Dropdowns) ---
        else if (interaction.isStringSelectMenu()) {
            
            // ---- A. É O MENU PRINCIPAL? (/menu) ----
            if (interaction.customId === MENU_ID_MAIN) {
                const searchType = interaction.values[0]; // 'movie', 'tv', ou 'person'
                
                // Se for 'pessoa', o fluxo é o antigo (só tem busca por nome)
                if (searchType === 'person') {
                    const modal = new ModalBuilder()
                        .setCustomId(`${MODAL_ID_PREFIX}${searchType}`) // 'menu_modal_person'
                        .setTitle('Buscar Pessoa');
                    const textInput = new TextInputBuilder()
                        .setCustomId(MODAL_INPUT_ID)
                        .setLabel('Qual o nome você deseja buscar?')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);
                    
                    modal.addComponents(new ActionRowBuilder().addComponents(textInput));
                    return await interaction.showModal(modal);
                }

                // Se for 'movie' ou 'tv', mostramos os novos botões de escolha
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${BTN_ID_SEARCH_BY_TITLE}${searchType}`) // 'btn_search_by_title_movie'
                        .setLabel('Buscar por Título')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📝'),
                    new ButtonBuilder()
                        .setCustomId(`${BTN_ID_SEARCH_BY_GENRE}${searchType}`) // 'btn_search_by_genre_movie'
                        .setLabel('Buscar por Gênero')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🎨')
                );

                await interaction.reply({
                    content: `Você selecionou **${searchType === 'movie' ? 'Filmes' : 'Séries'}**. Como deseja buscar?`,
                    components: [row],
                    ephemeral: true
                });
            }

            // ---- B. É O NOVO MENU DE GÊNEROS? ----
            else if (interaction.customId.startsWith(MENU_ID_GENRE_SELECT)) {
                await interaction.deferReply({ ephemeral: true });

                const type = interaction.customId.replace(MENU_ID_GENRE_SELECT, ''); // 'movie' ou 'tv'
                const genreId = interaction.values[0]; // O ID do gênero que o usuário escolheu
                
                // Pega o Nome do Gênero (só para o log, opcional)
                const genres = await getGenreList(type);
                const genreName = genres.find(g => g.id.toString() === genreId)?.name || 'Desconhecido';
                
                console.log(`[EVENT] ⚙️ Busca por Gênero: Tipo=${type}, Gênero=${genreName} (ID=${genreId})`);

                // Chama o handler de paginação!
                // Passamos o ID do Gênero como 'query' e o modo 'genre'
                await startPagination(interaction, genreId, type, 'genre');
            }
        } 
        
        // --- 3. Handler para Botões ---
        else if (interaction.isButton()) {

            // ---- A. É O BOTÃO "BUSCAR POR TÍTULO"? ----
            if (interaction.customId.startsWith(BTN_ID_SEARCH_BY_TITLE)) {
                const type = interaction.customId.replace(BTN_ID_SEARCH_BY_TITLE, ''); // 'movie' ou 'tv'
                
                // Mostra o modal (fluxo antigo)
                const modal = new ModalBuilder()
                    .setCustomId(`${MODAL_ID_PREFIX}${type}`) // 'menu_modal_movie'
                    .setTitle(`Buscar ${type === 'movie' ? 'Filme' : 'Série'} por Título`);
                const textInput = new TextInputBuilder()
                    .setCustomId(MODAL_INPUT_ID)
                    .setLabel('Qual o título você deseja buscar?')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                
                modal.addComponents(new ActionRowBuilder().addComponents(textInput));
                await interaction.showModal(modal);
            }

            // ---- B. É O BOTÃO "BUSCAR POR GÊNERO"? ----
            else if (interaction.customId.startsWith(BTN_ID_SEARCH_BY_GENRE)) {
                await interaction.deferUpdate(); // Acknowledge o clique no botão
                
                const type = interaction.customId.replace(BTN_ID_SEARCH_BY_GENRE, ''); // 'movie' ou 'tv'
                
                try {
                    // 1. Busca a lista de gêneros na API
                    const genres = await getGenreList(type);

                    // 2. Formata para o formato do Select Menu
                    const options = genres.map(genre => ({
                        label: genre.name,
                        value: genre.id.toString(), // O valor TEM que ser string
                    }));

                    // 3. Cria o Menu
                    const genreMenu = new StringSelectMenuBuilder()
                        .setCustomId(`${MENU_ID_GENRE_SELECT}${type}`) // 'menu_select_genre_movie'
                        .setPlaceholder('Selecione um gênero...')
                        .addOptions(options.slice(0, 25)); // Limite de 25 opções por menu

                    const row = new ActionRowBuilder().addComponents(genreMenu);
                    
                    // 4. Responde (editando a mensagem dos botões) com o menu de gêneros
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

        // --- 4. Handler para Envios de Formulário (Modal) ---
        else if (interaction.isModalSubmit()) {
            
            // Verifica se é o nosso modal de busca por TÍTULO ou PESSOA
            if (interaction.customId.startsWith(MODAL_ID_PREFIX)) {
                await interaction.deferReply({ ephemeral: true }); 

                const searchType = interaction.customId.replace(MODAL_ID_PREFIX, ''); // 'movie', 'tv', ou 'person'
                const searchQuery = interaction.fields.getTextInputValue(MODAL_INPUT_ID);

                console.log(`[EVENT] ⚙️ Modal Submit (Título): Tipo=${searchType}, Busca="${searchQuery}"`);

                // Chama o handler de paginação!
                // O modo 'title' é o padrão, então não precisamos passar
                await startPagination(interaction, searchQuery, searchType, 'title');
            }
        }
    },
};