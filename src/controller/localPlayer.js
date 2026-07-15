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
import fs from "fs";
import fsp from 'fs/promises';
import { setActivePlayback, clearActivePlayback, getActivePlayback } from '../utils/playbackStateManager.js';
import { env } from '../config/env.js';

export async function localPlayer(filePath, mediaName, interaction) {

    const GUILD_ID = interaction.guildId;
    const LOCAL_FILE_PATH = path.join(process.cwd(), env.dataDir(), filePath);
    
    // 1. Obtém o ID da mensagem de resposta da interação atual
    let currentMessage;
    try {
        currentMessage = await interaction.fetchReply();
    } catch (e) {
        console.error("❌ Não foi possível obter a mensagem de resposta da interação:", e);
        return;
    }
    const currentMessageId = currentMessage.id;

    const client = new Client({
        // Certifica-se de que as intents necessárias estão presentes
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });

    console.log("Iniciando o bot de voz...");
    console.log(`[DEBUG] Guild ID da Interação: ${GUILD_ID}`);
    
    const initMsg = `🔊 Iniciando reprodução do arquivo: \`${mediaName}\` no canal de voz...`;
    await interaction.editReply({ content: initMsg });
    
    // CORREÇÃO: Usando clientReady em vez de ready para evitar o DeprecationWarning
    client.once("clientReady", async () => {
        
        console.log(`✅ Logado como ${client.user.tag}`);
        
        // ** LOGS DE DIAGNÓSTICO **
        console.log(`[DIAGNOSTICO] Buscando Guild com ID: ${GUILD_ID}`);
        let guild = client.guilds.cache.get(GUILD_ID);
        console.log(`[DIAGNOSTICO] Guild Encontrada: ${guild ? guild.name : 'NÃO ENCONTRADA'}`);

        // Pega o canal de voz do usuário que invocou o comando
        let channel = interaction.member?.voice.channel;
        
        console.log(`[DIAGNOSTICO] interaction.member.voice: ${interaction.member?.voice ? 'OK' : 'NULL/UNDEFINED'}`);
        console.log(`[DIAGNOSTICO] Canal de Voz: ${channel ? `${channel.name} (Tipo: ${channel.type})` : 'NÃO ENCONTRADO/USUÁRIO NÃO CONECTADO'}`);
        // ** FIM DOS LOGS DE DIAGNÓSTICO **
        
        if (!guild || !channel || channel.type !== ChannelType.GuildVoice) {
            
            // Log detalhado da falha
            if (!guild) {
                console.error("MOTIVO DA FALHA: Guild não encontrada.");
            } else if (!interaction.member?.voice) {
                console.error("MOTIVO DA FALHA: Membro não tem dados de voz (verifique as Guild Intents).");
            } else if (!channel) {
                console.error("MOTIVO DA FALHA: Usuário não está em um canal de voz.");
            } else if (channel.type !== ChannelType.Voice) {
                console.error(`MOTIVO DA FALHA: Canal encontrado não é de voz (Tipo: ${channel.type}).`);
            }
            
            console.error(
                "❌ Guild ou canal de voz não encontrados ou ID inválido! O usuário deve estar em um canal de voz."
            );
            client.destroy();
            // Edita a resposta da interação para informar o erro ao usuário
            await interaction.editReply({ 
                content: "❌ Você precisa estar em um canal de voz para usar este comando!" 
            });
            return;
        }
        console.log(`✅ Guild e canal de voz encontrados: ${guild.name} / ${channel.name}`);

        // Verifica se o arquivo de áudio local existe
        if (!fs.existsSync(LOCAL_FILE_PATH)) {
            console.error(
                `❌ Arquivo de áudio não encontrado no caminho: ${LOCAL_FILE_PATH}`
            );
            client.destroy();
            const errorMsg = `❌ Arquivo de áudio não encontrado:\n \`${mediaName}\`.`;
            await interaction.editReply({ content: errorMsg });
            return;
        }
        console.log(`✅ Arquivo de áudio encontrado: ${LOCAL_FILE_PATH}`);

        // Verifica se já existe uma conexão ativa e a encerra
        let connection = getVoiceConnection(GUILD_ID);
        if (connection) {
            console.log(
                `⚠️ Conexão existente encontrada (Status: ${connection.state.status}). Destruindo para nova reprodução...`
            );
            
            // Lógica para editar a MENSAGEM ANTERIOR
            const oldMessageId = await getActivePlayback(GUILD_ID);
            console.log(`[STATE] Mensagem ativa anterior para Guild ${GUILD_ID}: ${oldMessageId}`);
            if (oldMessageId) {
                console.log(`[STATE] Tentando editar a mensagem anterior (ID: ${oldMessageId}) para indicar interrupção...`);
                try {
                    // Busca o canal de texto original para editar a mensagem
                    const textChannel = guild.channels.cache.get(interaction.channelId);
                    console.log(`[STATE] Canal de texto encontrado: ${textChannel ? textChannel.name : 'NÃO ENCONTRADO'} ${textChannel.type} `);
                    if (textChannel && textChannel.type === ChannelType.GuildVoice) {
                        const oldMessage = await textChannel.messages.fetch(oldMessageId);
                        console.log(`[STATE] Mensagem anterior buscada com sucesso.`);
                        // Extrai apenas o nome da mídia anterior, ignorando o prefixo de status.
                        // Assume que a mídia está sempre entre `...` no final da mensagem.
                        const match = oldMessage.content.match(/`([^`]+)`$/);
                        const oldMediaName = match ? match[1] : 'Mídia Anterior';

                        await oldMessage.edit({ 
                            content: `🛑 Reprodução Interrompida: Nova mídia iniciada. \`${oldMediaName}\`` 
                        });
                        console.log(`[STATE] ✅ Mensagem anterior (ID: ${oldMessageId}) editada.`);
                    }
                } catch (e) {
                    // Ignora erros de edição se a mensagem foi deletada, etc.
                    console.error(`[STATE] ❌ Falha ao editar a mensagem anterior (ID: ${oldMessageId}): ${e.message}`);
                }
            }
            // Limpa o estado e destrói a conexão
            await clearActivePlayback(GUILD_ID);
            connection.destroy();
            connection = undefined;
            
        } else {
            console.log("✅ Nenhuma conexão ativa encontrada. Prosseguindo...");
        }

        const connectMsg = `🔊 Conectando ao canal de voz **${channel.name}**...`;
        await interaction.editReply({ content: connectMsg });
        
        // Tenta conectar ao canal de voz
        try {
            console.log(`[CONEXÃO] Tentando conectar ao canal ID: ${channel.id} na Guild ID: ${GUILD_ID}`);
            connection = joinVoiceChannel({
                channelId: channel.id, // Usa o ID do canal de voz do usuário
                guildId: GUILD_ID,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: true,
            });
            console.log("🔊 Tentando conectar ao canal de voz...");
            await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
            console.log("✅ Conexão de voz estabelecida.");
            
            // REGISTRA O ID DA MENSAGEM ATUAL no estado APÓS a conexão
            await setActivePlayback(GUILD_ID, currentMessageId);

        } catch (error) {
            console.error(
                "💥 Erro ao conectar-se ao canal de voz:",
                error.message
            );
            client.destroy();
            // Garante que o arquivo baixado seja limpo
            await fsp.unlink(LOCAL_FILE_PATH).catch(e => console.error(`[CLEANUP] ❌ Falha ao deletar arquivo: ${e.message}`));
            console.log(`[CLEANUP] 🗑️ Arquivo deletado após falha de conexão: ${path.basename(filePath)}`);
            return;
        }

        // Cria o player de áudio e reproduz o arquivo local
        const player = createAudioPlayer();
        try {
            const resource = createAudioResource(LOCAL_FILE_PATH);
            console.log(`🎶 Arquivo de áudio carregado: ${filePath}`);
            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Playing, () => {
                console.log(`▶️ Reproduzindo áudio "${filePath}"...`);
                const playMsg = `▶️ Reproduzindo agora: \`${mediaName}\``;
                interaction.editReply({ content: playMsg });
            });
            
            player.on(AudioPlayerStatus.Idle, async () => {
                console.log(`🛑 Fim da reprodução de "${filePath}". Desconectando...`);
                
                // Desconecta e limpa o estado
                if (
                    connection &&
                    connection.state.status !== VoiceConnectionStatus.Destroyed
                ) {
                    connection.destroy();
                }
                client.destroy();
                const endMsg = `✅ Reprodução concluída: \`${mediaName}\``;
                await interaction.editReply({ content: endMsg });
                
                // Limpeza final do arquivo e do estado
                await clearActivePlayback(GUILD_ID);
                await fsp.unlink(LOCAL_FILE_PATH).catch(e => console.error(`[CLEANUP] ❌ Falha ao deletar arquivo: ${e.message}`));
                console.log(`[CLEANUP] 🗑️ Arquivo deletado após reprodução: ${path.basename(filePath)}`);
            });

            player.on("error", async (error) => {
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

    client.login(env.discordToken());
}