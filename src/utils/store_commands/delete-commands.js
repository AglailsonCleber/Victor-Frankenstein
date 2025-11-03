// delete_commands.js
require('dotenv').config();
const { REST, Routes } = require('discord.js');

// Configurações
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.APPLICATION_ID; // Pegue o ID do seu bot no Developer Portal, aba General
const GUILD_ID = process.env.SERVER_ID; // Opcional: para limpar comandos SOMENTE neste servidor

// Objeto REST para fazer chamadas HTTP à API do Discord
const rest = new REST({ version: '10' }).setToken(TOKEN);

// --- Função para Deletar Comandos ---
async function deleteCommands() {
    try {
        console.log('Iniciando a exclusão de comandos de barra...');

        let route;
        if (GUILD_ID) {
            // Rota para COMANDOS DO SERVIDOR (Mais rápido para atualizar)
            route = Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);
        } else {
            // Rota para COMANDOS GLOBAIS (Pode levar até 1 hora para sumir)
            route = Routes.applicationCommands(CLIENT_ID);
        }

        // 1. Obtém a lista de todos os comandos registrados
        const commands = await rest.get(route);
        console.log(`Comandos encontrados para exclusão: ${commands.length}`);

        if (commands.length === 0) {
            console.log('Nenhum comando para excluir. Saindo.');
            return;
        }

        // 2. Itera sobre a lista e deleta cada comando
        for (const command of commands) {
            const commandId = command.id;
            let deleteRoute;

            if (GUILD_ID) {
                deleteRoute = Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, commandId);
            } else {
                deleteRoute = Routes.applicationCommand(CLIENT_ID, commandId);
            }

            await rest.delete(deleteRoute);
            console.log(`Comando excluído com sucesso: ${command.name} (ID: ${commandId})`);
        }

        console.log('✅ Limpeza de comandos concluída com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao tentar excluir comandos:', error);
    }
}

deleteCommands();