FROM node:20-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    yt-dlp \
    procps \
    su-exec

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN addgroup -S -g 1000 appgroup \
    && adduser -S -u 1000 -G appgroup appuser \
    && mkdir -p /usr/src/app/data \
    && chown -R appuser:appgroup /usr/src/app

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
