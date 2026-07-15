# Passo 1: Imagem Base
FROM node:20-alpine

# Passo 2: Dependências do sistema (FFmpeg, Python, yt-dlp)
WORKDIR /usr/src/app

RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    yt-dlp \
    procps

# Passo 3: Dependências Node.js (cache layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Passo 4: Código-fonte
COPY . .

# Passo 5: Diretório de dados persistente
RUN mkdir -p /usr/src/app/data

# Passo 6: Usuário não-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /usr/src/app
USER appuser

ENV NODE_ENV=production

CMD ["npm", "start"]
