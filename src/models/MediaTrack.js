/**
 * Representa uma única faixa de mídia na fila de reprodução do bot.
 */
export default class MediaTrack {
    /**
     * Construtor para criar uma nova faixa de mídia.
     * @param {string} title - O título da mídia.
     * @param {string} url - A URL da fonte (geralmente do YouTube).
     * @param {number} duration - A duração em segundos.
     * @param {string} requestedBy - O nome ou tag do usuário que solicitou a faixa.
     * @param {string} [thumbnail=null] - URL da imagem de miniatura.
     */
    constructor(title, url, duration, requestedBy, thumbnail = null) {
        this.title = title;
        this.url = url;
        this.duration = duration; // Duração em segundos (usada para o display)
        this.requestedBy = requestedBy;
        this.thumbnail = thumbnail;
        this.id = this._generateId(); // ID único para possíveis operações futuras
    }

    // ----------------------------------------------------------------------
    // MÉTODOS INTERNOS
    // ----------------------------------------------------------------------
    
    /**
     * Gera um ID simples e único.
     * @private
     * @returns {string} Um ID baseado no tempo.
     */
    _generateId() {
        // Gera um ID simples e razoavelmente único baseado no tempo e um número aleatório
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    // ----------------------------------------------------------------------
    // MÉTODOS DE EXIBIÇÃO
    // ----------------------------------------------------------------------

    /**
     * Retorna a duração formatada em MM:SS.
     * @returns {string} Duração formatada.
     */
    getFormattedDuration() {
        if (typeof this.duration !== 'number' || this.duration <= 0) {
            return '00:00';
        }
        
        const totalSeconds = Math.floor(this.duration);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        const paddedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds; 
        
        // Formato MM:SS
        return `${paddedMinutes}:${paddedSeconds}`;
    }

    /**
     * Cria e retorna um objeto simples (raw object) com os dados da faixa.
     * Pode ser útil para serialização (ex: salvar em JSON).
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
            thumbnail: this.thumbnail,
        };
    }
}