// src/events/interactionCreate.js
module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Verifica se é um comando de barra (/)
        if (!interaction.isChatInputCommand()) return;
        
        // --- LOG DE RECEBIMENTO DE EVENTO ---
        console.log(`[EVENT] ⚙️ Interação Slash Command recebida: /${interaction.commandName} de ${interaction.user.tag}`);
        // ------------------------------------

        // Pega o comando na coleção que foi carregada no index.js
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`[COMMAND ERROR] Comando /${interaction.commandName} não encontrado no cache.`);
            return;
        }

        try {
            await command.execute(interaction);
            console.log(`[COMMAND] 🟢 Comando /${interaction.commandName} executado com sucesso.`);
        } catch (error) {
            console.error(`[COMMAND ERROR] 🔴 Erro ao executar /${interaction.commandName}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'Houve um erro ao tentar executar este comando!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Houve um erro ao tentar executar este comando!', ephemeral: true });
            }
        }
    },
};