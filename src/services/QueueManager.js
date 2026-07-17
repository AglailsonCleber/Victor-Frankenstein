// src/services/QueueManager.js (Versão FINAL com Limpeza, Loop Corrigido e Streaming)

import { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    VoiceConnectionStatus, 
    NoSubscriberBehavior,
    entersState,
    VoiceConnectionDisconnectReason
} from '@discordjs/voice';
import { Guild, GuildMember, TextChannel, PermissionFlagsBits } from 'discord.js';
import path from 'path';
import { env } from '../config/env.js';
import { createStreamFromYtDlp } from '../utils/streamAudioYtDlp.js';

// Assumindo que estes caminhos estão corretos
import MediaTrack from '../models/MediaTrack.js'; 
import { generatePlayerEmbed } from '../utils/generatePlayerEmbed.js'; 
import { deleteLocalFile } from '../utils/fileCleanup.js';

// --------------------------------------------------------------------------
// Constantes e Funções Auxiliares
// --------------------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), env.dataDir());
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Cria um recurso de áudio a partir do caminho do arquivo local.
 * @param {string} filename O nome do arquivo local (ex: 'Artista - Titulo.mp3').
 * @returns {import('@discordjs/voice').AudioResource}
 */
const getAudioResourceFromFile = (filename) => {
    if (!filename) throw new Error("Nome do arquivo não fornecido para recurso de áudio.");
    const fullPath = path.join(DATA_DIR, filename);
    console.log(`[INFO] Criando recurso de áudio do arquivo: ${fullPath}`);
    return createAudioResource(fullPath, { inlineVolume: true }); 
};


export default class QueueManager {
    /**
     * @param {Guild} guild O objeto Guild (servidor) do Discord.
     */
    constructor(guild) {
        this.guild = guild;
        this.queue = []; 
        this.currentTrack = null;
        this.connection = null; 
        this.textChannel = null; 
        this.playerMessage = null;
        this.isLooping = false;
        this.isShuffling = false;
        this.controllerUserId = null;
        this.maxQueueSize = env.maxQueueSize();
        this.streamProcess = null;
        this.streamCleanup = null;
        
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });
        
        this._setupPlayerListeners();
    }

    _killActiveStream() {
        if (this.streamCleanup) {
            this.streamCleanup();
            this.streamCleanup = null;
        }
        this.streamProcess = null;
    }

    /**
     * Configura os ouvintes de evento do AudioPlayer.
     */
    _setupPlayerListeners() {
        // Lógica de FINISH (Ao finalizar a faixa)
        this.audioPlayer.on(AudioPlayerStatus.Idle, async () => {
            console.log(`[PLAYER] 🎧 Faixa terminada: ${this.currentTrack?.title}`);
            
            // 1. LIMPEZA DO ARQUIVO LOCAL DA FAIXA FINALIZADA
            // Só deleta se for arquivo local E NÃO estiver em loop
            if (this.currentTrack && this.currentTrack.filePath && !this.isLooping) {
                await deleteLocalFile(this.currentTrack.filePath);
            }

            this._killActiveStream();
            if (!this.isLooping) {
                this.currentTrack = null;
            }
            
            this.playNext(); // Chama playNext para continuar a fila
        });

        // Lógica de ERRO
        this.audioPlayer.on('error', async (error) => {
            console.error(`[PLAYER] ❌ Erro no AudioPlayer (${this.currentTrack?.title}): ${error.message}`);
            
            // 1. LIMPEZA DO ARQUIVO LOCAL EM CASO DE ERRO
            if (this.currentTrack && this.currentTrack.filePath) {
                await deleteLocalFile(this.currentTrack.filePath);
            }

            this._killActiveStream();
            this.currentTrack = null;
            this.playNext(); // Tenta a próxima faixa
        });

        // Lógica de Conexão (opcional, mas bom para debug)
        this.audioPlayer.on(AudioPlayerStatus.Playing, () => {
             console.log(`[PLAYER] ▶️ Tocando agora: ${this.currentTrack?.title}`);
             this.updatePlayerMessage();
        });

        // Eventos da conexão (opcional, mas bom para debug)
        this.connection?.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
             // O tratamento de desconexão abrupta (kickado/canal vazio) é melhor feito
             // no evento voiceStateUpdate.js 
        });
    }

    /**
     * Conecta o bot ao canal de voz e inicia a reprodução.
     * @param {GuildMember} member O membro que solicitou a reprodução.
     * @param {TextChannel} textChannel O canal de texto para enviar mensagens.
     */
    async start(member, textChannel) {
        if (!member.voice.channel) {
            return '❌ Você deve estar em um canal de voz para usar este comando.';
        }

        if (!this.controllerUserId) {
            this.controllerUserId = member.id;
        }

        if (!this.connection) {
            this.connection = joinVoiceChannel({
                channelId: member.voice.channel.id,
                guildId: member.guild.id,
                adapterCreator: member.guild.voiceAdapterCreator,
                selfDeaf: true,
            });

            // Aguarda a conexão ficar pronta
            try {
                await entersState(this.connection, VoiceConnectionStatus.Ready, 5_000);
            } catch (error) {
                console.error(`[VOICE] ❌ Falha ao conectar ao canal de voz: ${error.message}`);
                this.connection?.destroy();
                this.connection = null;
                return '❌ Não foi possível conectar ao canal de voz. Tente novamente.';
            }
        }
        
        this.textChannel = textChannel;
        this.connection.subscribe(this.audioPlayer);

        if (!this.currentTrack && this.queue.length > 0) {
            this.playNext();
        }
        return `✅ Conectado ao canal de voz **${member.voice.channel.name}**!`;
    }

    /**
     * Adiciona uma nova faixa à fila e tenta iniciar a reprodução.
     * @param {MediaTrack} track A faixa de mídia a ser adicionada.
     */
    addTrack(track) {
        if (this.queue.length >= this.maxQueueSize) {
            throw new Error(`A fila atingiu o limite de ${this.maxQueueSize} faixas.`);
        }

        this.queue.push(track);
        console.log(`[QUEUE] ➕ Faixa adicionada: ${track.title}`);

        if (this.audioPlayer.state.status === AudioPlayerStatus.Idle && this.connection) {
            this.playNext();
        } else {
            this.updatePlayerMessage();
        }
    }

    /**
     * Alterna o estado de pausa/retomar.
     * @returns {string} Mensagem de status.
     */
    togglePause() {
        if (!this.currentTrack) {
            return '❌ Não há música tocando.';
        }

        if (this.audioPlayer.state.status === AudioPlayerStatus.Playing) {
            this.audioPlayer.pause();
            this.updatePlayerMessage();
            return '⏸️ Música pausada.';
        } else if (this.audioPlayer.state.status === AudioPlayerStatus.Paused) {
            this.audioPlayer.unpause();
            this.updatePlayerMessage();
            return '▶️ Música retomada.';
        }
        return '❌ Estado de reprodução inválido.';
    }
    
    /**
     * Pula a faixa atual. (Garante a exclusão do arquivo local da faixa pulada).
     * @returns {string} Mensagem de status.
     */
    skip() {
        if (!this.connection || !this.currentTrack) {
            return '❌ Não há música tocando para pular.';
        }
        
        const skippedTrackTitle = this.currentTrack.title;
        
        // Desativa o loop para garantir que a próxima faixa seja puxada da fila
        this.isLooping = false; 
        
        // 1. LIMPEZA DO ARQUIVO LOCAL DA FAIXA PULADA
        // Chamada direta para garantir exclusão imediata. (Ignorado se for streaming)
        if (this.currentTrack.filePath) {
            deleteLocalFile(this.currentTrack.filePath); 
        }

        this.audioPlayer.stop(); // Isso irá forçar o estado para Idle e iniciar a próxima
        return `⏭️ Faixa pulada: **${skippedTrackTitle}**.`;
    }

    /**
     * Para a reprodução, destrói a conexão e limpa a fila. 
     * (Garante a exclusão de todos os arquivos: atual e da fila).
     * @returns {string} Mensagem de status.
     */
    async stop() {
        if (!this.connection) {
            return '❌ O bot não está em um canal de voz.';
        }
        
        // 1. LIMPA O PLAYER: Isso libera o bloqueio do arquivo atual
        // Este é o passo CRUCIAL que faltava ser executado antes da limpeza.
        this.audioPlayer.stop();
        await sleep(500);

        this._killActiveStream();
        // 2. Limpa a faixa atual e deleta o arquivo (Ignorado se for streaming)
        if (this.currentTrack && this.currentTrack.filePath) {
            // O arquivo agora deve estar desbloqueado pelo stop acima
            deleteLocalFile(this.currentTrack.filePath); 
        }

        // 3. Limpa a fila e deleta todos os arquivos
        this.queue.forEach(track => {
            if (track.filePath) {
                deleteLocalFile(track.filePath);
            }
        });
        
        // 4. Limpa a conexão
        this.connection.destroy();
        
        // 5. Limpa o estado da fila
        this.queue = [];
        this.currentTrack = null;
        this.connection = null;
        this.isLooping = false;
        this.isShuffling = false;
        this.controllerUserId = null;
        this.playerMessage?.delete().catch(() => {}); 
        this.playerMessage = null;

        return '🛑 Reprodução interrompida e canal liberado. Arquivos locais limpos.';
    }
    
    /**
     * Remove uma faixa específica da fila pelo ID e deleta o arquivo.
     * @param {string} trackId O ID da faixa a ser removida.
     * @returns {string} Mensagem de status.
     */
    removeTrack(trackId) {
        const index = this.queue.findIndex(t => t.id === trackId);

        if (index === -1) {
            return '❌ Faixa não encontrada na fila.';
        }

        const removedTrack = this.queue.splice(index, 1)[0];
        
        // 1. LIMPEZA DO ARQUIVO LOCAL DA FAIXA REMOVIDA (Ignorado se for streaming)
        if (removedTrack.filePath) {
            deleteLocalFile(removedTrack.filePath);
        }
        
        this.updatePlayerMessage();
        return `🗑️ Faixa **${removedTrack.title}** removida da fila.`;
    }

    /**
     * Toca a próxima faixa na fila. (Suporta arquivo local OU streaming).
     */
    async playNext() {
        let nextTrack = null;

        if (this.isLooping && this.currentTrack) {
            // Se estiver em loop, currentTrack já foi mantido pelo listener 'Idle'
            nextTrack = this.currentTrack;
        } else if (this.queue.length > 0) {
            // Lógica de shuffle ou FIFO
            if (this.isShuffling) {
                const randomIndex = Math.floor(Math.random() * this.queue.length);
                nextTrack = this.queue.splice(randomIndex, 1)[0];
            } else {
                nextTrack = this.queue.shift(); 
            }
        }
        
        if (!nextTrack) {
            this.audioPlayer.stop(); 
            this.updatePlayerMessage();
            this.textChannel?.send('✅ Fila vazia! Reprodução finalizada.');
            // Destrói a conexão após 30s se ninguém interagir
            setTimeout(() => {
                if (this.connection) {
                    this.connection.destroy();
                    this.connection = null;
                }
            }, 30000); 
            return;
        }

        this.currentTrack = nextTrack;

        try {
            this._killActiveStream();

            let resource;
            if (nextTrack.filePath) {
                resource = getAudioResourceFromFile(nextTrack.filePath);
            } else {
                console.log(`[INFO] Streaming via yt-dlp: ${nextTrack.url}`);
                const stream = createStreamFromYtDlp(nextTrack.url);
                this.streamProcess = stream.process;
                this.streamCleanup = stream.cleanup;
                resource = stream.resource;
            }

            this.audioPlayer.play(resource);
            
            // Única lógica de envio/atualização da mensagem do player:
            if (this.playerMessage) {
                await this.updatePlayerMessage();
            } else if (this.textChannel) {
                const { embeds, components } = generatePlayerEmbed(this);
                this.playerMessage = await this.textChannel.send({ embeds, components });
            }

        } catch (error) {
            console.error(`[PLAYER] Erro ao tocar ${nextTrack.title}:`, error);
            this.textChannel?.send(`❌ Erro ao tocar ${nextTrack.title}. Pulando...`);

            this._killActiveStream();
            if (nextTrack.filePath) {
                await deleteLocalFile(nextTrack.filePath);
            }
            
            this.currentTrack = null; 
            this.playNext(); // Tenta a próxima
        }
    }
    
    /**
     * Retorna a lista de faixas formatada (para o comando /queue ou botão).
     */
    getQueueList() {
        let response = '';

        if (this.currentTrack) {
            response += `**▶️ Tocando Agora:** [${this.currentTrack.getFormattedDuration()}] ${this.currentTrack.title} (Solicitado por: ${this.currentTrack.requestedBy})\n---\n`;
        }

        if (this.queue.length === 0) {
            response += 'A fila está vazia.';
            return response;
        }
        
        const list = this.queue.slice(0, 10)
            .map((track, index) => 
                `**${index + 1}.** [${track.getFormattedDuration()}] ${track.title}`
            )
            .join('\n');
            
        response += `**Próximas na Fila (${this.queue.length} total):**\n${list}`;

        if (this.queue.length > 10) {
            response += `\n...e mais ${this.queue.length - 10} faixas.`;
        }

        return response;
    }

    /**
     * Alterna o estado de loop.
     * @returns {string} Mensagem de status.
     */
    toggleLoop() {
        this.isLooping = !this.isLooping;
        this.isShuffling = false; // Desativa shuffle se ativar loop
        this.updatePlayerMessage();
        return this.isLooping ? '🔁 Loop ativado! A faixa atual repetirá.' : '↩️ Loop desativado.';
    }

    /**
     * Alterna o estado de shuffle (reprodução aleatória).
     * @returns {string} Mensagem de status.
     */
    toggleShuffle() {
        this.isShuffling = !this.isShuffling;
        this.isLooping = false; // Desativa loop se ativar shuffle
        this.updatePlayerMessage();
        return this.isShuffling ? '🔀 Shuffle ativado! A fila será embaralhada a cada faixa.' : '➡️ Shuffle desativado.';
    }

    canControl(userId, member = null) {
        if (member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
            return true;
        }
        if (!this.controllerUserId) {
            return true;
        }
        return this.controllerUserId === userId;
    }

    /**
     * Atualiza a mensagem incorporada do player.
     */
    async updatePlayerMessage() {
        if (this.playerMessage && this.playerMessage.editable) {
            try {
                const { embeds, components } = generatePlayerEmbed(this);
                await this.playerMessage.edit({ embeds, components });
            } catch (error) {
                // Se o bot não conseguir editar (ex: mensagem foi deletada manualmente)
                console.warn(`[PLAYER] ⚠️ Falha ao atualizar mensagem do player: ${error.message}`);
                this.playerMessage = null; // Limpa a referência
            }
        }
    }
}