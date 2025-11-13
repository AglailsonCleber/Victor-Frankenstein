import "dotenv/config";
import { Client, GatewayIntentBits, ChannelType } from "discord.js";
import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    entersState,
    VoiceConnectionStatus,
    getVoiceConnection,
} from "@discordjs/voice";
import path from "path";
import fs from "fs"; // Usado para fs.existsSync no cleanup
import fsp from 'fs/promises';
import { setActivePlayback, clearActivePlayback, getActivePlayback } from '../utils/playbackStateManager.js';

/**
 * Toca um arquivo de áudio local no canal de voz do usuário.
 * ATENÇÃO: ESTA FUNÇÃO INICIA UM NOVO CLIENTE DO DISCORD (INADEQUADO PARA PROJETOS GRANDES).
 * @param {string} filePath O nome do arquivo local dentro da pasta 'data/'.
 * @param {string} mediaName O nome da mídia para log/status.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction O objeto de interação do comando.
 */
export async function localPlayer(filePath, mediaName, interaction) {

    const GUILD_ID = interaction.guildId;
    // Cria o caminho absoluto para o arquivo de áudio
    const LOCAL_FILE_PATH = path.join(process.cwd(), "data", filePath);
    
    // 1. Obtém o ID da mensagem de resposta da interação atual
    let currentMessage;
    try {
        currentMessage = await interaction.fetchReply();
    } catch (e) {
        console.error("❌ Não foi possível obter a mensagem de resposta da interação:", e);
        return;
    }
    const currentMessageId = currentMessage.id;

    // --- LÓGICA DE CONEXÃO E BOT DE VOZ (MINIMALISTA) ---
    // AVISO: Esta abordagem cria um novo Client, o que não é ideal. 
    // Em produção, a conexão de voz deve ser gerenciada pelo QueueManager 
    // e o Client principal (index.js).

    const client = new Client({
        // Certifica-se de que as intents necessárias estão presentes
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });

    console.log("Iniciando o bot de voz...");
    console.log(`[DEBUG] Guild ID da Interação: ${GUILD_ID}`);


    client.on("ready", async () => {
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            await interaction.editReply({
                content: "❌ Você precisa estar em um canal de voz."
            });
            client.destroy(); // Limpa o cliente temporário
            return;
        }

        // 2. Conexão ao canal de voz
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        const clientUser = client.user;
        const GUILD_MEMBER = interaction.guild.members.cache.get(clientUser.id);
        
        // Verifica se o bot tem permissão de 'speak'
        if (!voiceChannel.speakable) {
            await interaction.editReply({
                content: `❌ Eu preciso de permissão para falar no canal ${voiceChannel.name}.`
            });
            connection.destroy();
            client.destroy();
            return;
        }

        // 3. Criação e Configuração do Player
        const audioPlayer = createAudioPlayer();
        connection.subscribe(audioPlayer);

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 5000); // Aguarda 5 segundos
            console.log(`[VOICE] Conectado ao canal de voz: ${voiceChannel.name}`);
        } catch (error) {
            console.error("❌ Falha ao entrar no canal de voz:", error);
            await interaction.editReply({
                content: "❌ Falha ao conectar ao canal de voz. Tente novamente."
            });
            connection.destroy();
            client.destroy();
            return;
        }

        // 4. Criação do Recurso e Início da Reprodução
        try {
            // Cria o recurso de áudio a partir do arquivo local.
            const resource = createAudioResource(LOCAL_FILE_PATH);
            audioPlayer.play(resource);
            console.log(`[PLAYER] ▶️ Reproduzindo: ${mediaName} (File: ${filePath})`);

            // Persiste o estado do playback ativo (Qual mensagem de interação está tocando)
            await setActivePlayback(GUILD_ID, currentMessageId);

            // 5. Tratamento de Fim de Reprodução
            audioPlayer.on(AudioPlayerStatus.Idle, async () => {
                console.log(`[PLAYER] ⏹️ Reprodução de ${mediaName} finalizada.`);
                
                // Destrói a conexão de voz
                if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                    connection.destroy();
                }
                client.destroy();

                // Limpa o estado persistente
                await clearActivePlayback(GUILD_ID);

                // Limpeza: Deleta o arquivo local após terminar
                await fsp.unlink(LOCAL_FILE_PATH).catch(e => console.error(`[CLEANUP] ❌ Falha ao deletar arquivo: ${e.message}`));
                console.log(`[CLEANUP] 🗑️ Arquivo deletado: ${path.basename(filePath)}`);
            });

            // 6. Tratamento de Erros do Player
            audioPlayer.on('error', async (error) => {
                console.error(`❌ Erro no player de áudio:`, error);
                console.error(
                    "⚠️ Verifique se o FFmpeg está instalado e acessível no seu PATH."
                );
                if (
                    connection &&
                    connection.state.status !== VoiceConnectionStatus.Destroyed
                ) {
                    connection.destroy();
                }
                client.destroy();
                // Limpeza em caso de erro
                await clearActivePlayback(GUILD_ID);
                await fsp.unlink(LOCAL_FILE_PATH).catch(e => console.error(`[CLEANUP] ❌ Falha ao deletar arquivo: ${e.message}`));
                console.log(`[CLEANUP] 🗑️ Arquivo deletado após erro: ${path.basename(filePath)}`);
            });

        } catch (error) {
            console.error("💥 Erro ao criar o recurso de áudio:", error.message);
            if (
                connection &&
                connection.state.status !== VoiceConnectionStatus.Destroyed
            ) {
                connection.destroy();
            }
            client.destroy();
            await clearActivePlayback(GUILD_ID);
            await fsp.unlink(LOCAL_FILE_PATH).catch(e => console.error(`[CLEANUP] ❌ Falha ao deletar arquivo: ${e.message}`));
            console.log(`[CLEANUP] 🗑️ Arquivo deletado após erro de recurso: ${path.basename(filePath)}`);
        }
    });

    // Conecta o cliente temporário
    client.login(process.env.DISCORD_TOKEN);
}