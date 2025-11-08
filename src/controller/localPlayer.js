import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
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

export async function localPlayer(filePath, mediaName, interaction) {

    const GUILD_ID = interaction.guildId;
    const CHANNEL_ID = interaction.channelId;
    const LOCAL_FILE_PATH = path.join(process.cwd(), "data", filePath);

    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });

    console.log("Iniciando o bot de voz...");
    
    const initMsg = `🔊 Iniciando reprodução do arquivo: \`${mediaName}\` no canal de voz...`;
    await interaction.editReply({ content: initMsg });
    
    client.once("ready", async () => {
        
        console.log(`✅ Logado como ${client.user.tag}`);

        // Verifica se o guild e o canal de voz existem
        let guild = client.guilds.cache.get(GUILD_ID);
        let channel = guild ? guild.channels.cache.get(CHANNEL_ID) : null;
        if (!guild || !channel || channel.type !== 2) {
            console.error(
                "❌ Guild ou canal de voz não encontrados ou ID inválido! Verifique os IDs."
            );
            client.destroy();
            return;
        }
        console.log(`✅ Guild e canal de voz encontrados: ${guild.name} / ${channel.name}`);

        // Verifica se o arquivo de áudio local existe
        if (!fs.existsSync(LOCAL_FILE_PATH)) {
            console.error(
                `❌ Arquivo de áudio não encontrado no caminho: ${LOCAL_FILE_PATH}`
            );
            console.error(
                `Certifique-se de que o arquivo "${filePath}" está na pasta "/data".`
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
                `⚠️ Conexão existente encontrada (Status: ${connection.state.status}). Destruindo para nova conexão...`
            );
            connection.destroy();
            connection = undefined;
        }
        console.log("✅ Nenhuma conexão ativa encontrada. Prosseguindo...");

        const connectMsg = `🔊 Conectando ao canal de voz **${channel.name}**...`;
        await interaction.editReply({ content: connectMsg });
        // Tenta conectar ao canal de voz
        try {
            connection = joinVoiceChannel({
                channelId: CHANNEL_ID,
                guildId: GUILD_ID,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: true,
            });
            console.log("🔊 Tentando conectar ao canal de voz...");
            await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
            console.log("✅ Conexão de voz estabelecida.");
        } catch (error) {
            console.error(
                "💥 Erro ao conectar-se ao canal de voz:",
                error.message
            );
            client.destroy();
            fsp.unlink(LOCAL_FILE_PATH);
            console.log(`[CLEANUP] 🗑️ Arquivo deletado após reprodução: ${path.basename(filePath)}`);
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
            player.on(AudioPlayerStatus.Idle, () => {
                console.log(`🛑 Fim da reprodução de "${filePath}". Desconectando...`);
                if (
                    connection &&
                    connection.state.status !== VoiceConnectionStatus.Destroyed
                ) {
                    connection.destroy();
                }
                client.destroy();
                const endMsg = `✅ Reprodução concluída: ▶️ \`${mediaName}\``;
                interaction.editReply({ content: endMsg });
                fsp.unlink(LOCAL_FILE_PATH);
                console.log(`[CLEANUP] 🗑️ Arquivo deletado após reprodução: ${path.basename(filePath)}`);
            });

            player.on("error", (error) => {
                console.error(`❌ Erro no player de áudio:`, error);
                console.error(
                    "⚠️ Se este erro persistir, verifique se o FFmpeg está instalado e acessível no seu PATH."
                );
                if (
                    connection &&
                    connection.state.status !== VoiceConnectionStatus.Destroyed
                ) {
                    connection.destroy();
                }
                client.destroy();
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
            fsp.unlink(LOCAL_FILE_PATH);
            console.log(`[CLEANUP] 🗑️ Arquivo deletado após reprodução: ${path.basename(filePath)}`);
        }
    });

    client.login(process.env.DISCORD_TOKEN);
}
