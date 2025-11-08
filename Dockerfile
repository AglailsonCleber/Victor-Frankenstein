# Passo 1: Imagem Base
# Usamos a imagem oficial 'node:20-alpine'.
FROM node:20-alpine

# Passo 2: Instalação das Dependências do Sistema (FFmpeg, Python, yt-dlp)
# É mais eficiente instalar estas ferramentas antes das dependências do Node.js.
# O '--no-cache' otimiza o tamanho final da imagem.
WORKDIR /usr/src/app

RUN apk update && \
    # 1. Instala FFmpeg
    apk add --no-cache ffmpeg && \
    # 2. Instala Python/Pip E yt-dlp JUNTOS via apk
    apk add --no-cache python3 py3-pip yt-dlp
    # Você pode remover a linha 'pip install yt-dlp' completamente.

# Passo 3: Otimização de Cache - Instalação de Dependências Node.js
# Copia APENAS os arquivos de configuração de dependências.
COPY package*.json ./

# Instala APENAS as dependências de produção (ignora 'devDependencies')
RUN npm install --omit=dev

# Passo 4: Copiar o Código-Fonte
# Copia o restante do seu projeto.
COPY . .

# Passo 5: Comando de Execução
# Este é o comando que o CasaOS/Docker executará para iniciar o bot.
CMD [ "npm", "start" ]