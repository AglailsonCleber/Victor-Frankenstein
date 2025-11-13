// QueueManager.js (Versão Final Corrigida)

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
import { Guild, GuildMember, TextChannel } from 'discord.js';

// Assumindo que estes caminhos estão corretos
import MediaTrack from '../models/MediaTrack.js'; 
import { generatePlayerEmbed } from '../utils/generatePlayerEmbed.js'; 

// --- Função Fictícia (Substitua pela lógica real de extração de stream) ---
/**
 * **ATENÇÃO:** Esta é uma função de substituição. 
 * Na implementação real, você usará ytdl-core ou yt-dlp para criar um stream de áudio 
 * a partir da 'url' da faixa.
 * @param {string} url A URL da faixa de mídia.
 * @returns {Promise<import('@discordjs/voice').AudioResource>} O recurso de áudio.
 */
const getAudioStream = async (url) => {
    console.log(`[INFO] Buscando stream para: ${url}`);
    // Na sua implementação real, o localPlayer.js baixava para 'data/'. 
    // Para um sistema de fila eficiente, o ideal é usar um stream direto.
    // O recurso abaixo é um placeholder para demonstrar a estrutura.
    // Exemplo de como um stream real deveria ser implementado:
    // return createAudioResource(ytdl(url, { filter: 'audioonly' }), { inlineVolume: true });
    
    // Placeholder: O `localPlayer.js` usava um arquivo local. Mantendo o placeholder 
    // para a estrutura, embora a implementação real use streams.
    return createAudioResource('data/audio.mp3', { inlineVolume: true }); 
};
// --------------------------------------------------------------------------

/**
 * Gerencia a fila de músicas, a conexão de voz e o player de áudio para um servidor.
 */
export default class QueueManager {
    /**
     * @param {Guild} guild O objeto Guild (servidor) do Discord.
     */
    constructor(guild) {
        this.guild = guild;
        this.queue = []; // Array de objetos MediaTrack
        this.currentTrack = null;
        this.connection = null; // VoiceConnection
        this.audioPlayer = null; // AudioPlayer
        this.textChannel = null; // Canal de texto para onde enviar mensagens
        this.playerMessage = null; // Mensagem do player que será atualizada
        this.isLooping = false;
        this.isShuffling = false;
        this.isStopping = false;
    }
    
    // ===================================================================
    // MÉTODOS DE CONTROLE DA FILA
    // ===================================================================

    /**
     * Adiciona uma faixa à fila.
     * @param {MediaTrack} track A faixa a ser adicionada.
     */
    addTrack(track) {
        this.queue.push(track);
    }
    
    /**
     * Inicia a reprodução (conecta e toca a primeira faixa, se houver).
     * @param {GuildMember} member O membro que solicitou a faixa (para obter o canal de voz).
     * @param {TextChannel} channel O canal de texto para enviar a mensagem do player.
     * @returns {Promise<string>} Mensagem de status.
     */
    async start(member, channel) {
        if (!member.voice.channel) {
            return '❌ Você precisa estar em um canal de voz.';
        }
        
        if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
             // Se já estiver conectado, apenas retorna uma mensagem de fila
             return `🎶 Adicionado à fila: **${this.queue[this.queue.length - 1].title}**`;
        }
        
        this.textChannel = channel;
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });
        
        // 1. Conecta ao canal de voz
        this.connection = joinVoiceChannel({
            channelId: member.voice.channel.id,
            guildId: this.guild.id,
            adapterCreator: this.guild.voiceAdapterCreator,
        });

        try {
            await entersState(this.connection, VoiceConnectionStatus.Ready, 5000);
            this.connection.subscribe(this.audioPlayer);
            console.log(`[QUEUE] ✅ Conectado e Player subscrito no Guild ${this.guild.id}.`);
            
            this.setupPlayerListeners(); // Configura os eventos de áudio
            this.setupConnectionListeners(); // Configura os eventos de conexão
            
            this.playNext(); // Inicia a reprodução
            
            // Retorna uma mensagem genérica de que está iniciando
            return `🚀 Iniciando reprodução...`; 

        } catch (error) {
            console.error(`[QUEUE ERROR] ❌ Falha ao conectar/entrar no estado READY: ${error.message}`);
            this.destroy(); // Limpa em caso de falha na conexão
            return `❌ Falha ao conectar no canal de voz: ${error.message}`;
        }
    }

    /**
     * Toca a próxima faixa na fila.
     */
    async playNext() {
        if (this.isStopping) return; // Se o bot foi parado, não faz nada
        
        let nextTrack = null;

        // Lógica de loop e shuffle
        if (this.isLooping && this.currentTrack) {
            nextTrack = this.currentTrack; // Toca a mesma faixa
        } else if (this.queue.length > 0) {
            
            if (this.isShuffling) {
                // Seleciona uma faixa aleatória e a remove da fila
                const randomIndex = Math.floor(Math.random() * this.queue.length);
                nextTrack = this.queue.splice(randomIndex, 1)[0];
            } else {
                // Toca a próxima na fila (FIFO)
                nextTrack = this.queue.shift();
            }
        }
        
        // Se não houver mais faixas para tocar
        if (!nextTrack) {
            this.textChannel?.send('⏹️ Fila de reprodução vazia. Desconectando em 5 minutos.');
            this.currentTrack = null;
            this.updatePlayerMessage();
            this.timeout = setTimeout(() => this.destroy(), 300000); // 5 minutos = 300000 ms
            return;
        }
        
        // Limpa o timeout de destruição
        if (this.timeout) clearTimeout(this.timeout);
        
        this.currentTrack = nextTrack;

        // Tenta buscar o stream e tocar
        try {
            // Este é o passo crucial: substitua o placeholder pelo stream real
            const resource = await getAudioStream(nextTrack.url);
            this.audioPlayer.play(resource);
            
            // Lógica de envio/atualização da mensagem do player:
            if (this.playerMessage) {
                // Se já existe, atualiza
                await this.updatePlayerMessage();
            } else if (this.textChannel) {
                // Se NÃO existe (primeira reprodução), envia
                const { embeds, components } = generatePlayerEmbed(this);
                this.playerMessage = await this.textChannel.send({ embeds, components });
            }
        } catch (error) {
            this.textChannel?.send(`❌ Erro ao tocar ${nextTrack.title}. Pulando...`);
            this.currentTrack = null; // Limpa a faixa com erro
            this.playNext(); // Tenta tocar a próxima faixa
        }
    }
    
    /**
     * Atualiza o embed do player com o estado e as faixas atuais.
     */
    async updatePlayerMessage() {
        if (!this.playerMessage || !this.currentTrack) return;
        
        try {
            const { embeds, components } = generatePlayerEmbed(this);
            await this.playerMessage.edit({ embeds, components });
        } catch (error) {
            console.error(`[QUEUE ERROR] Falha ao atualizar a mensagem do player: ${error.message}`);
            // Se a mensagem não puder ser editada, tentamos enviar uma nova no canal de texto
            if (this.textChannel) {
                const { embeds, components } = generatePlayerEmbed(this);
                this.playerMessage = await this.textChannel.send({ embeds, components }).catch(e => null);
            } else {
                 this.playerMessage = null;
            }
        }
    }
    
    // ===================================================================
    // MÉTODOS DE CONTROLE DO PLAYER
    // ===================================================================

    /** Pausa/Resume o player */
    togglePauseResume() {
        if (!this.audioPlayer) return '❌ O player não está ativo.';
        
        if (this.audioPlayer.state.status === AudioPlayerStatus.Playing) {
            this.audioPlayer.pause();
            this.updatePlayerMessage();
            return '⏸️ Player Pausado.';
        } else if (this.audioPlayer.state.status === AudioPlayerStatus.Paused) {
            this.audioPlayer.unpause();
            this.updatePlayerMessage();
            return '▶️ Player Retomado.';
        }
        return 'O player não está no estado Pausado ou Tocando.';
    }

    /** Pula a faixa atual */
    skip() {
        if (this.audioPlayer && this.currentTrack) {
            const skippedTitle = this.currentTrack.title;
            // Emite o evento Idle forçando o player a chamar playNext()
            this.audioPlayer.emit(AudioPlayerStatus.Idle); 
            return `⏭️ Pulando: **${skippedTitle}**`;
        }
        return '❌ Nenhuma faixa para pular.';
    }

    /** Interrompe a reprodução e destrói o player/conexão */
    stop() {
        this.isStopping = true;
        this.destroy();
        return '🛑 Reprodução interrompida e player destruído.';
    }
    
    /** Alterna o modo de loop */
    toggleLoop() {
        this.isLooping = !this.isLooping;
        this.updatePlayerMessage();
        return this.isLooping ? '🔁 Loop ativado (repetirá a faixa atual).' : 'Loop desativado.';
    }
    
    /** Alterna o modo shuffle */
    toggleShuffle() {
        this.isShuffling = !this.isShuffling;
        this.updatePlayerMessage();
        return this.isShuffling ? '🔀 Shuffle ativado (próxima faixa será aleatória).' : 'Shuffle desativado.';
    }
    
    /**
     * Retorna a lista da fila formatada.
     */
    getQueueList() {
        let response = '';

        if (this.currentTrack) {
            response += `**▶️ Tocando Agora:** [${this.currentTrack.getFormattedDuration()}] ${this.currentTrack.title}\n---\n`;
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
            response += `\n... Mais ${this.queue.length - 10} faixas.`;
        }
        
        return response;
    }
    
    // ===================================================================
    // LISTENERS E LIMPEZA
    // ===================================================================

    /**
     * Configura os listeners de áudio (principalmente para fim de faixa).
     */
    setupPlayerListeners() {
        this.audioPlayer.on('error', (error) => {
            console.error(`[PLAYER ERROR] 💥 Erro no player de áudio: ${error.message}`);
            this.textChannel?.send(`❌ Erro crítico no player. Pulando a faixa atual.`);
            // Força a transição para Idle para tentar tocar a próxima
            this.audioPlayer.emit(AudioPlayerStatus.Idle); 
        });

        // Quando a faixa atual termina, toca a próxima
        this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
             console.log(`[PLAYER] ⏹️ Faixa finalizada.`);
             this.playNext();
        });
        
        // Atualiza a mensagem quando o estado muda (ex: Pausado, Tocando)
        this.audioPlayer.on(AudioPlayerStatus.Playing, () => this.updatePlayerMessage());
        this.audioPlayer.on(AudioPlayerStatus.Paused, () => this.updatePlayerMessage());
    }
    
    /**
     * Configura os listeners da conexão de voz (para desconexão).
     */
    setupConnectionListeners() {
        this.connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            console.log(`[VOICE] Desconectado por: ${newState.reason}`);
            
            // Tenta reconectar em caso de erro da rede do Discord
            if (newState.reason === VoiceConnectionDisconnectReason.WebSocketCloseAndRejoin || 
                newState.reason === VoiceConnectionDisconnectReason.Error) {
                
                try {
                    await entersState(this.connection, VoiceConnectionStatus.Ready, 5000);
                    console.log('[VOICE] ✅ Reconectado com sucesso.');
                } catch (error) {
                    console.log('[VOICE] ❌ Falha na reconexão. Destruindo.');
                    this.destroy(); // Destrói se a reconexão falhar
                }
            } else {
                // Outras razões de desconexão (ex: movido para outro canal, bot kickado)
                this.destroy();
            }
        });
    }

    /**
     * Destrói a conexão de voz, o player e limpa o estado.
     * Esta função é chamada ao parar o bot ou após o timeout.
     */
    destroy() {
        this.queue = [];
        this.currentTrack = null;
        this.isStopping = true;
        
        if (this.timeout) clearTimeout(this.timeout);
        
        if (this.audioPlayer) {
            this.audioPlayer.stop();
            this.audioPlayer = null;
        }

        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
        }
        
        // Envia a mensagem de "Player parado"
        if (this.playerMessage) {
            try {
                 this.playerMessage.edit({ 
                    embeds: [{ 
                        title: '🛑 Player Parado', 
                        description: 'Fui desligado. Use `!play` para reiniciar.' 
                    }], 
                    components: [] 
                }).catch(() => null); // Ignora erro de edição
            } catch (error) {
                // ...
            }
            this.playerMessage = null;
        }
        
        // Remove a instância do QueueManager da Collection principal do Client
        this.guild.client.queueManagers.delete(this.guild.id);
        console.log(`[QUEUE] 🗑️ QueueManager destruído para Guild ${this.guild.id}.`);
    }
}