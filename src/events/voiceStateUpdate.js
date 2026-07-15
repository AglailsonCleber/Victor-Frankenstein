// src/events/voiceStateUpdate.js

import { Events, ChannelType } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { deleteLocalFile } from '../utils/fileCleanup.js';

// 1. EXPORT DE DADOS DO EVENTO
export const data = {
  name: Events.VoiceStateUpdate,
  once: false,
};

// 2. EXPORT DA FUNÇÃO EXECUTE
/**
 * Lida com o evento VoiceStateUpdate, verificando a desconexão do bot e o esvaziamento do canal,
 * garantindo a limpeza dos arquivos locais.
 * @param {import('discord.js').VoiceState} oldState O estado de voz anterior.
 * @param {import('discord.js').VoiceState} newState O estado de voz atual.
 */
export async function execute(oldState, newState) {
  const guildId = oldState.guild.id;
  // Acessa o QueueManager (player) e a conexão de voz existente
  const player = oldState.client.queueManagers?.get(guildId);
  const connection = getVoiceConnection(guildId);

  // --- 1. Lógica de Interrupção/Desconexão (Bot Removido ou Deixou o Canal) ---

  // Condição: O membro que mudou o estado é o próprio bot
  if (oldState.member.user.id === oldState.client.user.id) {
    // Bot saiu do canal (oldState tinha channelId, newState não tem)
    if (oldState.channelId && !newState.channelId) {
      console.log(`[VOICE] ❌ Bot desconectado de ${oldState.channel.name}. Iniciando limpeza.`);

      // Usa o método player.stop() para limpar player, fila e deletar arquivos
      if (player) {
        await player.stop();
        oldState.client.queueManagers.delete(guildId);
      }
      return;
    }
  }

  // --- 2. Lógica de "Canal Vazio" ---
  // Condição: O bot está conectado, mas alguém saiu do canal
  if (connection && oldState.channelId) {
    const channel = oldState.channel || newState.channel;

    // Verifica se o canal é válido (apenas voz)
    if (channel && channel.type === ChannelType.GuildVoice) {
      // Filtra apenas membros humanos (que não são bots)
      const humanMembers = channel.members.filter(m => !m.user.bot);

      // Se não há mais membros humanos no canal
      if (humanMembers.size === 0) {
        if (player) {
          console.log(`[VOICE] ⚠️ Canal vazio. Desconectando e limpando arquivos.`);
          // Usa o método stop() para limpeza total (incluindo arquivos)
          player.stop();
          oldState.client.queueManagers.delete(guildId);
        } else {
          // Se o QueueManager já foi limpo, mas a conexão persistiu
          connection.destroy();
        }
        return;
      }
    }
  }

  // --- 3. Lógica de Notificação de Entrada (CORRIGIDA) ---
  // Verifica se um usuário entrou em um canal de voz onde antes não estava
  if (!oldState.channelId && newState.channelId && newState.member.user.id !== newState.client.user.id) {
    
    // Ignora atualizações de bots para evitar loops e mensagens indesejadas
    if (newState.member?.user.bot) return;

    const voiceChannel = newState.channel;
    const member = newState.member;
    const guild = voiceChannel.guild;

    // Garante que é um canal de voz antes de prosseguir
    if (voiceChannel.type !== ChannelType.GuildVoice) return;

    // FORÇA O CACHE A SER ATUALIZADO
    // Isso é feito para garantir que os canais recém-criados ou atualizados 
    // estejam no cache antes da busca.
    try {
      await guild.channels.fetch();

    } catch (error) {
      console.error(`[ERRO VOZ] Falha ao buscar canais na guilda ${guild.name}:`, error);
      return;
    }

    // 2. Procura o canal de texto no cache atualizado
    // Encontra o canal de texto que tem o MESMO NOME do canal de voz
    const textChannel = guild.channels.cache.find(channel =>
      channel.name === voiceChannel.name && channel.isTextBased()
    );

    // 3. Se o canal de texto correspondente for encontrado
    if (textChannel) {
      const message =
        `📢 **${member.user}** acabou de entrar no canal de voz **${voiceChannel.name}**! @here Junte-se a ele!`;

      try {
        await textChannel.send(message);
        console.log(`[EVENTO VOZ] ✅ Notificação automática enviada para #${textChannel.name}.`);
      } catch (error) {
        console.error(`[ERRO VOZ] ❌ Não foi possível enviar mensagem para #${textChannel.name}.`, error);
      }
    }

  }
}