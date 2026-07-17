// src/events/messageCreate.js (Comandos de Música e Admin Integrados e Otimizados)

import { Events } from "discord.js";
import { env } from "../config/env.js";

// --- EXPORTAÇÃO DE DADOS PARA O HANDLER ---\r\n
export const data = {
  name: Events.MessageCreate,
  once: false,
};

// --- FUNÇÃO DE EXECUÇÃO ---\r\n
/**
 * Lida com mensagens de texto para comandos de prefixo e música.
 * @param {import('discord.js').Message} message O objeto de mensagem recebido.
 */
export async function execute(message) {
  const prefix = env.commandPrefix();

  // Ignora mensagens de bots e mensagens sem o prefixo
  if (message.author.bot || !message.content.startsWith(prefix) || !message.guild || !message.member) return;

  const [commandName, ...args] = message.content.slice(prefix.length).trim().split(/ +/);
  const command = commandName.toLowerCase();
  const guildId = message.guild.id;

  // Garante que a coleção de QueueManagers existe no client
  if (!message.client.queueManagers) {
    message.client.queueManagers = new Map();
  }
  
  // Obtém o manager para o servidor atual
  let player = message.client.queueManagers.get(guildId);
  
  // Lógica para comandos de Admin (Prefixos)
  const adminModule = message.client.prefixCommands?.get("admin");
  const {
    deployGuildCommands,
    deployGlobalCommands,
    deleteGuildCommands,
    deleteGlobalCommands
  } = adminModule || {};

  switch (command) {
    // Comandos Admin (Chamadas diretas da função exportada em src/commands/prefix/admin.js)
    case "deploy-guild-commands":
      if (deployGuildCommands) return deployGuildCommands(message);
      break;
    case "deploy-global-commands":
      if (deployGlobalCommands) return deployGlobalCommands(message);
      break;
    case "delete-guild-commands":
      if (deleteGuildCommands) return deleteGuildCommands(message);
      break;
    case "delete-global-commands":
      if (deleteGlobalCommands) return deleteGlobalCommands(message);
      break;
    
    // Comandos de Música (Prefixos - Exemplo Simplificado)
    case 'play':
      return message.reply('Use `/reproduzir` para tocar música com streaming.');

    case 'skip':
    case 'pause':
    case 'resume':
    case 'stop':
    case 'queue':
    case 'loop':
    case 'shuffle':
      if (!player) {
        return message.reply('❌ Não há música tocando.');
      }

      if (!player.canControl(message.author.id, message.member)) {
        return message.reply('❌ Apenas quem iniciou a reprodução (ou quem tem Gerenciar Servidor) pode controlar a fila.');
      }
      if (player[command]) {
        const result = player[command](); 
        
        if (typeof result === 'string') {
          message.reply(result); // Respostas como "Música pausada", "Fila vazia", etc.
        } 
        
        // 3. Lógica específica para o 'stop'
        if (command === 'stop') {
          message.client.queueManagers.delete(guildId);
        }
      }
      return; 
  }

  // --- 3. LÓGICA NORMAL PARA OUTROS COMANDOS DE PREFIXO ---\r\n
  const prefixCommand = message.client.prefixCommands?.get(command);

  if (!prefixCommand) return; // Se não for um comando conhecido

  try {
    await prefixCommand.execute(message, args);
  } catch (error) {
    console.error(`❌ Erro ao executar o comando de prefixo !${command}:`, error);
    message.reply('❌ Ocorreu um erro ao executar este comando!').catch(() => {});
  }
}