# Passo 1: Imagem Base
# Usamos a imagem oficial 'node:20-alpine'. 'Alpine' é uma versão do Linux muito leve,
# o que torna seu contêiner de bot muito menor e mais rápido.
FROM node:20-alpine

# Passo 2: Diretório de Trabalho
# Define o diretório padrão dentro do contêiner onde o bot ficará.
WORKDIR /usr/src/app

# Passo 3: Otimização de Cache - Instalação de Dependências
# Copia APENAS o package.json e o package-lock.json primeiro.
# O Docker só re-executará este passo se estes arquivos mudarem.
COPY package*.json ./

# Instala APENAS as dependências de produção (ignora 'devDependencies')
# Isso é crucial para manter a imagem leve.
RUN npm install --omit=dev

# Passo 4: Copiar o Código-Fonte
# Copia todo o resto do seu projeto (index.js, pasta src/, etc.) 
# para o diretório de trabalho.
COPY . .

# Passo 5: Comando de Execução
# Este é o comando que o CasaOS/Docker executará para iniciar o bot.
# Ele chama o script "start" que você definiu no package.json.
CMD [ "npm", "start" ]