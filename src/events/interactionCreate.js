// src/events/interactionCreate.js (Corrigido para o Handler ESM)

import { 
    InteractionType, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    Events // Importe Events para garantir o nome correto
} from 'discord.js'; 

// Handlers
import { startPagination } from '../utils/paginationHandler.js'; 
import { getGenreList } from '../services/api_tmdb.js'; 

// --- IDs ÚNICOS para todos os nossos componentes ---
// ... (IDs mantidos iguais) ...
const MENU_ID_MAIN = 'menu_select_search_type';
const BTN_ID_SEARCH_BY_TITLE = 'btn_search_by_title_'; 
const BTN_ID_SEARCH_BY_GENRE = 'btn_search_by_genre_'; 
const MENU_ID_GENRE_SELECT = 'menu_select_genre_'; 
const MODAL_ID_PREFIX = 'menu_modal_'; 
const MODAL_INPUT_ID = 'search_query_input';


// --- 1. EXPORTAÇÃO 'data' (Obrigatória para o Handler) ---
export const data = { 
    name: Events.InteractionCreate, // Usa o enum oficial para o nome
    once: false,
};

// --- 2. EXPORTAÇÃO 'execute' ---
export async function execute(interaction) { 
    
    // --- 1. Handler para Comandos de Barra (/) ---
    if (interaction.isChatInputCommand()) {
        console.log(`[EVENT] ⚙️ Slash Command: /${interaction.commandName} de ${interaction.user.tag}`);

        // NOTA DE CORREÇÃO: O handler de comandos de barra usa client.slashCommands
        const command = interaction.client.slashCommands.get(interaction.commandName);
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
            const searchType = interaction.values[0]; 
            
            // Se for 'pessoa', o fluxo é o antigo (só tem busca por nome)
            if (searchType === 'person') {
                const modal = new ModalBuilder()
                    .setCustomId(`${MODAL_ID_PREFIX}${searchType}`) 
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
                    .setCustomId(`${BTN_ID_SEARCH_BY_TITLE}${searchType}`) 
                    .setLabel('Buscar por Título')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId(`${BTN_ID_SEARCH_BY_GENRE}${searchType}`) 
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

            const type = interaction.customId.replace(MENU_ID_GENRE_SELECT, ''); 
            const genreId = interaction.values[0]; 
            
            // Pega o Nome do Gênero (só para o log, opcional)
            const genres = await getGenreList(type); 
            const genreName = genres.find(g => g.id.toString() === genreId)?.name || 'Desconhecido';
            
            console.log(`[EVENT] ⚙️ Busca por Gênero: Tipo=${type}, Gênero=${genreName} (ID=${genreId})`);

            // Chama o handler de paginação!
            await startPagination(interaction, genreId, type, 'genre'); 
        }
    } 
    
    // --- 3. Handler para Botões ---
    else if (interaction.isButton()) {

        // ---- A. É O BOTÃO "BUSCAR POR TÍTULO"? ----
        if (interaction.customId.startsWith(BTN_ID_SEARCH_BY_TITLE)) {
            const type = interaction.customId.replace(BTN_ID_SEARCH_BY_TITLE, ''); 
            
            // Mostra o modal (fluxo antigo)
            const modal = new ModalBuilder()
                .setCustomId(`${MODAL_ID_PREFIX}${type}`) 
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
            await interaction.deferUpdate(); 
            
            const type = interaction.customId.replace(BTN_ID_SEARCH_BY_GENRE, ''); 
            
            try {
                // 1. Busca a lista de gêneros na API
                const genres = await getGenreList(type); 

                // 2. Formata para o formato do Select Menu
                const options = genres.map(genre => ({
                    label: genre.name,
                    value: genre.id.toString(), 
                }));

                // 3. Cria o Menu
                const genreMenu = new StringSelectMenuBuilder()
                    .setCustomId(`${MENU_ID_GENRE_SELECT}${type}`) 
                    .setPlaceholder('Selecione um gênero...')
                    .addOptions(options.slice(0, 25)); 

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

            const searchType = interaction.customId.replace(MODAL_ID_PREFIX, ''); 
            const searchQuery = interaction.fields.getTextInputValue(MODAL_INPUT_ID);

            console.log(`[EVENT] ⚙️ Modal Submit (Título): Tipo=${searchType}, Busca="${searchQuery}"`);

            // Chama o handler de paginação!
            await startPagination(interaction, searchQuery, searchType, 'title'); 
        }
    }
}