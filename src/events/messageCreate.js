// src/events/messageCreate.js (Comandos de Música e Admin Integrados e Otimizados)

import { Events, Collection } from "discord.js";
import QueueManager from '../services/QueueManager.js';
import MediaTrack from '../models/MediaTrack.js';
// É necessário importar a função de Admin para desestruturar os métodos
// Assumindo que o admin.js usa `deployGuildCommands`, etc.
// NOTA: O seu código original parece assumir que o 'admin.js' está na Collection prefixCommands, 
// o que permite esta desestruturação.

// --- EXPORTAÇÃO DE DADOS PARA O HANDLER ---
export const data = {
  name: Events.MessageCreate,
  once: false,
};

// --- FUNÇÃO DE EXECUÇÃO ---\
/**
 * @param {import('discord.js').Message} message - O objeto Message do Discord.
 */
export async function execute(message) {
  const prefix = "!";

  // 1. Filtragem rápida
  if (message.author.bot || !message.content.startsWith(prefix) || !message.guild || !message.member) return;

  const [commandName, ...args] = message.content.slice(prefix.length).trim().split(/ +/);
  const command = commandName.toLowerCase();
  const guildId = message.guild.id;

  // --- 1. TENTATIVA DE EXECUTAR COMANDOS ADMINISTRATIVOS ESPECIAIS (Deploy/Delete) ---
  const adminModule = message.client.prefixCommands?.get("admin");
  const {
    deployGuildCommands,
    deployGlobalCommands,
    deleteGuildCommands,
    deleteGlobalCommands
  } = adminModule || {};

  switch (commandName) {
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
  }

  // --- 2. TENTATIVA DE EXECUTAR COMANDOS DO PLAYER DE MÚSICA (Exemplo: !play, !skip) ---
  // A. Obtém ou cria o QueueManager
  let player = message.client.queueManagers?.get(guildId);

  // Se o bot não tem um map de QueueManagers, cria um temporário
  if (!message.client.queueManagers) {
    message.client.queueManagers = new Collection();
  }
  
  if (!player) {
    // Se o comando for para começar a tocar, cria um novo player
    if (command === 'play') {
      player = new QueueManager(message.guild);
      message.client.queueManagers.set(guildId, player);
    } else {
      // Se não houver player ativo e o comando não for 'play', ignora os comandos de player
      // ou envia um aviso
      if (['skip', 'pause', 'resume', 'stop', 'queue', 'loop', 'shuffle'].includes(command)) {
        message.reply("❌ Não há nenhuma música tocando ou fila ativa.");
        return;
      }
    }
  }

  // B. Switch para comandos de player
  switch (command) {
    case 'play':
      // A lógica do 'play' aqui é um DUMMY para demonstração no código de prefixo
      // e não usa o sistema de download complexo do /reproduzir.
      // A lógica real de reprodução de áudio deve ser implementada aqui, 
      // ou o bot deve ser direcionado a usar o comando /reproduzir.
      
      // Exemplo de como funcionaria o `!play` simples:
      // Apenas adiciona uma faixa dummy para testar o QueueManager
      const dummyTrack = new MediaTrack(
        args.join(' ') || 'Música de Exemplo Padrão', // Usa args como título
        'https://fakeurl.com/stream',
        180,
        message.author.tag
      );

      player.addTrack(dummyTrack);
      player.start(message.member, message.channel); // member para obter o canal de voz
      message.reply(`Adicionado à fila: **${dummyTrack.title}**`);
      return; // Termina aqui

    case 'skip':
    case 'pause':
    case 'resume':
    case 'stop':
    case 'queue':
    case 'loop':
    case 'shuffle':
      // Executa o método correspondente do player
      if (player && player[command]) {
        const result = player[command](); // Chama player.skip(), player.pause(), etc.
        if (typeof result === 'string') {
          message.reply(result); // Envia a resposta de métodos como toggleLoop/Shuffle e getQueueList
        }
      }
      if (command === 'stop') {
        // Limpa o manager se o comando for 'stop'
        message.client.queueManagers.delete(guildId);
      }
      return; // Termina aqui
  }

  // --- 3. LÓGICA NORMAL PARA OUTROS COMANDOS DE PREFIXO ---\
  const prefixCommand = message.client.prefixCommands?.get(command);

  if (!prefixCommand) return; // Se não for admin, música ou comando prefixo não existente

  try {
    await prefixCommand.execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply('❌ Ocorreu um erro ao executar este comando de prefixo!');
  }
}