// src/events/messageCreate.js
const { Events } = require("discord.js");
const prefix = "!"; // Assumindo o seu prefixo

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    
    // Ignora mensagens de bots e mensagens sem o prefixo
    
    if (message.author.bot || !message.content.startsWith(prefix)) return;
    
    // Separa o comando e os argumentos

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    // --- Lógica Especial para Comandos Administrativos (Deploy/Delete) ---

    const adminModule = message.client.commands.get("admin");

    if (commandName === "deploy-commands") {
      if (adminModule && adminModule.deployCommands) {
        return adminModule.deployCommands(message);
      }
    }
    
    // Comando para deletar apenas os comandos globais do seu bot
    
    if (commandName === "delete-my-global") {
      if (adminModule && adminModule.deleteMyGlobalCommands) {
        return adminModule.deleteMyGlobalCommands(message);
      }
    }
    
    // Comando para deletar apenas os comandos do seu bot neste servidor (Guild)

    if (commandName === "delete-my-guild") {
      if (adminModule && adminModule.deleteMyGuildCommands) {
        return adminModule.deleteMyGuildCommands(message);
      }
    }
    
    // ---------------------------------------------------------------------
    // Lógica Normal para outros comandos de Prefixo (!ajuda, !ping, etc.)
    
    const command = message.client.commands.get(commandName);

    if (!command) return;

    try {
      await command.execute(message, args);
    } catch (error) {
      console.error(error);
      message.reply("Houve um erro ao tentar executar esse comando!");
    }
  },
};
