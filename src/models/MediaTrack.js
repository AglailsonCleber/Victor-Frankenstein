export default class MediaTrack {
    constructor(
        title,
        url,
        duration,
        requestedBy,
        filePath = null,
        thumbnail = null,
        requestedByUserId = null
    ) {
        this.title = title;
        this.url = url;
        this.duration = duration;
        this.requestedBy = requestedBy;
        this.requestedByUserId = requestedByUserId;
        this.filePath = filePath;
        this.thumbnail = thumbnail;
        this.id = this._generateId();
    }

    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    getFormattedDuration() {
        if (!this.duration) return '??:??';
        const minutes = Math.floor(this.duration / 60);
        const seconds = Math.floor(this.duration % 60);
        const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds;
        return `${minutes}:${paddedSeconds}`;
    }

    toObject() {
        return {
            id: this.id,
            title: this.title,
            url: this.url,
            duration: this.duration,
            formattedDuration: this.getFormattedDuration(),
            requestedBy: this.requestedBy,
            requestedByUserId: this.requestedByUserId,
            thumbnail: this.thumbnail,
        };
    }
}
