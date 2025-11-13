// src/events/voiceStateUpdate.js

import { Events, ChannelType } from 'discord.js'; // Importação do ChannelType

// 1. EXPORT DE DADOS
export const data = {
  name: Events.VoiceStateUpdate,
  once: false,
};

// 2. EXPORT DA FUNÇÃO EXECUTE
/**
 * @param {import('discord.js').VoiceState} oldState - O estado de voz anterior.
 * @param {import('discord.js').VoiceState} newState - O novo estado de voz.
 */
export async function execute(oldState, newState) {
  console.log(`[EVENTO VOZ] Detected voice state update for user ${newState.member.user.tag}.`);

  // --- Lógica de Detecção de Entrada ---
  // A condição verifica se:
  // 1. O usuário NÃO estava em um canal (`!oldState.channelId`).
  // 2. E AGORA ESTÁ em um canal (`newState.channelId`).
  if (!oldState.channelId && newState.channelId) {

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
        `📢 **${member.user.tag}** acabou de entrar no canal de voz **${voiceChannel.name}**! Junte-se a ele!`;

      try {
        await textChannel.send(message);
        console.log(`[EVENTO VOZ] ✅ Notificação automática enviada para #${textChannel.name}.`);
      } catch (error) {
        console.error(`[ERRO VOZ] ❌ Não foi possível enviar mensagem para #${textChannel.name}.`, error);
      }
    }
  }

  // --- Lógica de Detecção de Saída do Bot (Música) ---
  // Esta lógica não está explicitada aqui, mas geralmente é adicionada para:
  // 1. Verificar se o BOT foi kickado do canal de voz.
  // 2. Parar a música e limpar o QueueManager.
}