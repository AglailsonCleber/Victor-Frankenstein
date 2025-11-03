// Exemplo de como seu messageCreate.js deve lidar com comandos de prefixo
const { Events } = require('discord.js');
const prefix = '!'; // Assumindo o seu prefixo

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignora mensagens de bots e mensagens sem o prefixo
        if (message.author.bot || !message.content.startsWith(prefix)) return;

        // Separa o comando e os argumentos
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // --- Lógica Especial para Comandos Administrativos (Deploy/Delete) ---
        if (commandName === 'deploy-commands') {
            const adminModule = message.client.commands.get('admin');
            if (adminModule && adminModule.deployCommands) {
                return adminModule.deployCommands(message);
            }
        }
        
        if (commandName === 'delete-commands') {
            const adminModule = message.client.commands.get('admin');
            if (adminModule && adminModule.deleteCommands) {
                return adminModule.deleteCommands(message);
            }
        }
        // ---------------------------------------------------------------------

        // Lógica Normal para outros comandos de Prefixo (ex: !ping)
        const command = message.client.commands.get(commandName);

        if (!command) return;

        try {
            // O comando 'ping' (ou qualquer outro prefixo) seria executado aqui
            await command.execute(message, args);
        } catch (error) {
            console.error(error);
            message.reply('Houve um erro ao tentar executar esse comando!');
        }
    },
};