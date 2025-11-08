// src/events/messageCreate.js (ES Module com Correções)

import { Events } from "discord.js";

// --- EXPORTAÇÃO DE DADOS PARA O HANDLER ---
export const data = {
  name: Events.MessageCreate, // Nome oficial do evento
  once: false,
};

// --- FUNÇÃO DE EXECUÇÃO ---
export async function execute(message) {
  const prefix = "!"; // Assumindo o seu prefixo

  // Ignora mensagens de bots e mensagens sem o prefixo
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  // Separa o comando e os argumentos
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  // Comandos administrativos e de prefixo são buscados em client.prefixCommands
  // Se o comando 'admin' for carregado como um comando de prefixo normal:
  const adminModule = message.client.prefixCommands.get("admin");

  // --- Lógica Especial para Comandos Administrativos (Deploy/Delete) ---

  // Acessamos as funções utilitárias que foram exportadas diretamente no admin.js
  // Os comandos de prefixo 'admin' agora exportam funções separadas:
  const {
    deployCommands,
    deleteMyGlobalCommands,
    deleteMyGuildCommands
  } = adminModule || {}; // Desestrutura com fallback para evitar falha se o admin não carregar

  if (commandName === "deploy-commands" && deployCommands) {
    return deployCommands(message);
  }

  if (commandName === "delete-my-global" && deleteMyGlobalCommands) {
    return deleteMyGlobalCommands(message);
  }

  if (commandName === "delete-my-guild" && deleteMyGuildCommands) {
    return deleteMyGuildCommands(message);
  }

  // ---------------------------------------------------------------------
  // Lógica Normal para outros comandos de Prefixo (!ajuda, !ping, etc.)

  const command = message.client.prefixCommands.get(commandName); // <-- CORREÇÃO: Usa prefixCommands

  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error("Houve um erro na execução do comando de prefixo:", error);
    message.reply("Houve um erro ao tentar executar esse comando!");
  }
}