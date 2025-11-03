// src/events/interactionCreate.js
const { 
    InteractionType, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder 
} = require('discord.js');
const { startPagination } = require('../utils/paginationHandler'); // <-- Importamos o novo handler

// IDs que usaremos para o menu
const MENU_ID = 'menu_select_search_type';
const MODAL_ID_PREFIX = 'menu_modal_';
const MODAL_INPUT_ID = 'search_query_input';

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {

        // --- 1. Handler para Comandos de Barra (/) ---
        if (interaction.isChatInputCommand()) {
            console.log(`[EVENT] ⚙️ Interação Slash Command recebida: /${interaction.commandName} de ${interaction.user.tag}`);

            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`[COMMAND ERROR] Comando /${interaction.commandName} não encontrado.`);
                return;
            }

            try {
                await command.execute(interaction);
                console.log(`[COMMAND] 🟢 Comando /${interaction.commandName} executado com sucesso.`);
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
            
            // Verifica se é o nosso menu principal
            if (interaction.customId === MENU_ID) {
                const searchType = interaction.values[0]; // 'movie', 'tv', ou 'person'
                
                // Cria o Formulário (Modal)
                const modal = new ModalBuilder()
                    .setCustomId(`${MODAL_ID_PREFIX}${searchType}`) // Ex: 'menu_modal_movie'
                    .setTitle(`Buscar ${searchType === 'movie' ? 'Filme' : (searchType === 'tv' ? 'Série' : 'Pessoa')}`);

                // Cria o campo de texto
                const textInput = new TextInputBuilder()
                    .setCustomId(MODAL_INPUT_ID)
                    .setLabel(`Qual o ${searchType === 'person' ? 'nome' : 'título'} você deseja buscar?`)
                    .setStyle(TextInputStyle.Short) // Campo de uma linha
                    .setRequired(true);
                
                const row = new ActionRowBuilder().addComponents(textInput);
                modal.addComponents(row);

                // Mostra o formulário para o usuário
                await interaction.showModal(modal);
            }
        } 
        
        // --- 3. Handler para Envios de Formulário (Modal) ---
        else if (interaction.isModalSubmit()) {
            
            // Verifica se é o formulário que acabamos de criar
            if (interaction.customId.startsWith(MODAL_ID_PREFIX)) {
                // Adia a resposta, pois a busca na API pode demorar
                await interaction.deferReply(); 

                // Extrai o tipo de busca do ID do modal
                const searchType = interaction.customId.replace(MODAL_ID_PREFIX, ''); // 'movie', 'tv', ou 'person'
                
                // Pega o texto que o usuário digitou no formulário
                const searchQuery = interaction.fields.getTextInputValue(MODAL_INPUT_ID);

                console.log(`[EVENT] ⚙️ Modal Submit recebido: Tipo=${searchType}, Busca="${searchQuery}"`);

                // *** CHAMA O HANDLER DE PAGINAÇÃO CENTRAL ***
                // O interaction já está "deferred", então o handler vai usar o editReply
                await startPagination(interaction, searchQuery, searchType);
            }
        }
    },
};