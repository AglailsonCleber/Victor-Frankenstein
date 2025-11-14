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
import { generatePlayerEmbed } from '../utils/generatePlayerEmbed.js'; 


// --- IDs ÚNICOS para todos os nossos componentes ---
// IDs de Pesquisa (TMDB)
const MENU_ID_MAIN = 'menu_select_search_type';
const BTN_ID_SEARCH_BY_TITLE = 'btn_search_by_title_'; 
const BTN_ID_SEARCH_BY_GENRE = 'btn_search_by_genre_'; 
const MENU_ID_GENRE_SELECT = 'menu_select_genre_'; 
const MODAL_ID_PREFIX = 'menu_modal_'; 
const MODAL_INPUT_ID = 'search_query_input';

// IDs de Player de Música (Usados em generatePlayerEmbed.js)
const PLAYER_BUTTONS = [
    'player_skip', 
    'player_pause_resume', 
    'player_stop', 
    'player_queue', 
    'player_loop', 
    'player_shuffle',
];

// --- EXPORTAÇÃO DE DADOS PARA O HANDLER ---
export const data = {
    name: Events.InteractionCreate,
    once: false,
};

// --- FUNÇÃO DE EXECUÇÃO ---
/**
 * Lida com todas as interações do Discord (comandos de barra, botões, menus, modais).
 * @param {import('discord.js').Interaction} interaction A interação recebida.
 */
export async function execute(interaction) {
    // 1. Slash Commands
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.slashCommands.get(interaction.commandName);

        if (!command) {
            console.error(`❌ Comando /${interaction.commandName} não encontrado.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`❌ Erro ao executar o comando /${interaction.commandName}:`, error);
            if (interaction.replied || interaction.deferred) {
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

    // 2. Componentes (Botões, Select Menus)
    else if (interaction.isStringSelectMenu() || interaction.isButton()) {
        
        // --- 2A. Componentes do Player de Música ---
        if (interaction.customId.startsWith('player_')) {
            await interaction.deferUpdate(); // Atualiza a interação para evitar timeout

            const guildId = interaction.guildId;
            const player = interaction.client.queueManagers?.get(guildId); // Usa encadeamento opcional
            const buttonId = interaction.customId.replace('player_', '');

            if (!player || !player.connection) {
                return interaction.followUp({ content: '❌ Não há música tocando neste servidor.', ephemeral: true });
            }

            let responseContent = '';
            
            switch (buttonId) {
                case 'skip':
                    responseContent = player.skip();
                    break;
                case 'pause_resume':
                    responseContent = player.togglePause();
                    break;
                case 'stop':
                    responseContent = player.stop();
                    interaction.client.queueManagers.delete(guildId); // Limpa o manager
                    break;
                case 'loop':
                    responseContent = player.toggleLoop();
                    break;
                case 'shuffle':
                    responseContent = player.toggleShuffle();
                    break;
                case 'queue':
                    responseContent = '📜 ' + player.getQueueList();
                    // Envia a lista de fila como uma nova mensagem temporária ou permanente
                    await interaction.channel.send({ content: responseContent }).catch(e => console.error("Erro ao enviar lista de fila: ", e));
                    responseContent = ''; // Limpa para não dar followUp repetido
                    break;
            }

            if (buttonId !== 'stop' && player.playerMessage) {
                // Atualiza o embed/botões do player principal, exceto se for o botão 'stop'
                const { embeds, components } = generatePlayerEmbed(player);
                await player.playerMessage.edit({ embeds, components }).catch(e => console.error("Erro ao editar player message após clique: ", e));
            }

            if (responseContent) {
                // Envia a resposta de confirmação (ex: "Música pausada")
                return interaction.followUp({ content: responseContent, ephemeral: true });
            }
            
            return; // Termina o processamento de botões do player
        }

        // --- 2B. Componentes de Pesquisa (TMDB) ---
        
        // a) StringSelectMenu (Seleção do tipo: Filme, Série, Pessoa)
        if (interaction.isStringSelectMenu() && interaction.customId === MENU_ID_MAIN) {
            
            const selectedType = interaction.values[0]; // 'movie', 'tv', ou 'person'
            
            // 1. Cria o ARRAY de componentes, incluindo o null condicional
            const componentsArray = [
                new ButtonBuilder()
                    .setCustomId(`${BTN_ID_SEARCH_BY_TITLE}${selectedType}`)
                    .setLabel('Buscar por Título/Nome')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔎'),
                
                // O botão de Gênero só aparece para Filmes ou Séries
                selectedType !== 'person' ? 
                    new ButtonBuilder()
                        .setCustomId(`${BTN_ID_SEARCH_BY_GENRE}${selectedType}`)
                        .setLabel('Descobrir por Gênero')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🏷️')
                    : null
            ];

            // 2. Filtra o array para remover o 'null' (se for 'person')
            const filteredComponents = componentsArray.filter(Boolean); // <--- CORREÇÃO APLICADA AQUI

            // 3. Cria a ActionRowBuilder e ADICIONA o array FILTRADO
            const row = new ActionRowBuilder().addComponents(filteredComponents);

            // Edita a mensagem original do slash command
            await interaction.update({
                content: `Opção selecionada: **${selectedType === 'movie' ? 'Filme' : selectedType === 'tv' ? 'Série' : 'Pessoa'}**. Agora, escolha o modo de busca:`,
                components: [row]
            });

        }
        
        // b) Botão: Buscar por Título/Nome (Abre o Modal)
        else if (interaction.isButton() && interaction.customId.startsWith(BTN_ID_SEARCH_BY_TITLE)) {
            const searchType = interaction.customId.replace(BTN_ID_SEARCH_BY_TITLE, ''); // 'movie', 'tv', 'person'
            
            const modal = new ModalBuilder()
                .setCustomId(`${MODAL_ID_PREFIX}${searchType}`)
                .setTitle(`Buscar por Título: ${searchType.toUpperCase()}`);

            const input = new TextInputBuilder()
                .setCustomId(MODAL_INPUT_ID)
                .setLabel('Digite o título/nome para pesquisar')
                .setStyle(TextInputStyle.Short)
                .setMinLength(2)
                .setMaxLength(100)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));

            await interaction.showModal(modal);

        }

        // c) Botão: Descobrir por Gênero (Busca os gêneros e cria o SelectMenu)
        else if (interaction.isButton() && interaction.customId.startsWith(BTN_ID_SEARCH_BY_GENRE)) {
            const type = interaction.customId.replace(BTN_ID_SEARCH_BY_GENRE, ''); // 'movie' ou 'tv'
            
            await interaction.deferUpdate(); // Defer para editar a mensagem

            try {
                const genres = await getGenreList(type);

                if (!genres || genres.length === 0) {
                    return interaction.editReply({ content: '❌ Não foi possível carregar a lista de gêneros.', components: [] });
                }

                const options = genres.map(genre => ({
                    label: genre.name,
                    description: `Pesquisar ${type === 'movie' ? 'Filmes' : 'Séries'} neste gênero.`,
                    value: genre.id.toString(), 
                }));

                const genreMenu = new StringSelectMenuBuilder()
                    .setCustomId(`${MENU_ID_GENRE_SELECT}${type}`) 
                    .setPlaceholder('Selecione um gênero...')
                    .addOptions(options.slice(0, 25)); // Limite de 25 opções

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

        // d) StringSelectMenu (Seleção do Gênero)
        else if (interaction.isStringSelectMenu() && interaction.customId.startsWith(MENU_ID_GENRE_SELECT)) {
            
            const type = interaction.customId.replace(MENU_ID_GENRE_SELECT, ''); // 'movie' ou 'tv'
            const genreId = interaction.values[0];
            
            console.log(`[EVENT] ⚙️ Select Menu (Gênero): Tipo=${type}, Gênero ID=${genreId}`);
            
            // Inicia a paginação para a busca por gênero (Mode: genre)
            await startPagination(interaction, genreId, type, 'genre');
        }


        // e) Botões de Paginação (São tratados internamente pelo coletor em paginationHandler.js)
        else if (interaction.customId.startsWith('page_') || interaction.customId.startsWith('btn_')) {
            // Apenas retorna. A lógica de resposta é feita pelo coletor na função startPagination.
            return; 
        }
    }

    // --- 3. Handler para Envios de Formulário (Modal) ---
    else if (interaction.isModalSubmit()) {
        
        if (interaction.customId.startsWith(MODAL_ID_PREFIX)) {
            await interaction.deferReply({ ephemeral: true }); 

            const searchType = interaction.customId.replace(MODAL_ID_PREFIX, ''); 
            const searchQuery = interaction.fields.getTextInputValue(MODAL_INPUT_ID);

            console.log(`[EVENT] ⚙️ Modal Submit (Título): Tipo=${searchType}, Busca=\"${searchQuery}\"`);

            // Inicia a paginação para a busca por título (Mode: title)
            await startPagination(interaction, searchQuery, searchType, 'title');
        }
    }
}