// src/models/MediaTrack.js

/**
 * Representa uma única faixa de mídia na fila de reprodução do bot.
 */
export default class MediaTrack {
    /**
     * Construtor para criar uma nova faixa de mídia.
     * @param {string} title - O título da mídia.
     * @param {string} url - A URL da fonte.
     * @param {number} duration - A duração em segundos.
     * @param {string} requestedBy - O nome ou ID do usuário que solicitou a faixa.
     * @param {string} filePath - O nome do arquivo local (ex: 'Artista - Titulo.mp3'). << NOVO
     * @param {string} thumbnail - URL da imagem de miniatura.
     */
    constructor(title, url, duration, requestedBy, filePath = null, thumbnail = null) {
        this.title = title;
        this.url = url;
        this.duration = duration;
        this.requestedBy = requestedBy;
        this.filePath = filePath; // << NOVO: Armazena o nome do arquivo para exclusão
        this.thumbnail = thumbnail;
        this.id = this._generateId(); 
    }

    /**
     * Gera um ID simples e único.
     * @private
     * @returns {string} Um ID baseado no tempo.
     */
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    /**
     * Retorna a duração formatada em MM:SS.
     * @returns {string} Duração formatada.
     */
    getFormattedDuration() {
        if (!this.duration) return '??:??';
        const minutes = Math.floor(this.duration / 60);
        const seconds = Math.floor(this.duration % 60);
        const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds; 
        
        return `${minutes}:${paddedSeconds}`
    }

    /**
     * Cria e retorna um objeto simples (raw object).
     * @returns {object} Objeto com os dados da faixa.
     */
    toObject() {
        return {
            id: this.id,
            title: this.title,
            url: this.url,
            duration: this.duration,
            formattedDuration: this.getFormattedDuration(),
            requestedBy: this.requestedBy,
            thumbnail: this.thumbnail
        };
    }
}
