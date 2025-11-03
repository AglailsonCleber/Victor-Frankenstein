# Victor-Frankenstein (Bot para Discord)

Victor-Frankenstein é um bot para Discord focado em entretenimento, construído com Node.js e a biblioteca [Discord.js](https://discord.js.org/). Sua principal funcionalidade é se conectar à API do The Movie Database (TMDB) para fornecer informações detalhadas sobre filmes, séries e celebridades.

## ✨ Funcionalidades

Atualmente, o bot suporta os seguintes comandos:

### Comandos de Barra (Slash Commands)
* `/filme [titulo]` - Busca por um filme no TMDB e permite navegar pelos resultados e páginas da API.
* `/serie [titulo]` - Busca por uma série de TV no TMDB com navegação de resultados.
* `/pessoa [nome]` - Busca por um ator, atriz ou diretor.
* `/ajuda` - Exibe esta mensagem de ajuda com a lista de comandos.

### Comandos de Prefixo
* `!ping` - Responde com "Pong!" para testar a latência do bot.
* `!deploy-commands` - (Apenas Admin) Força o registro de novos comandos de barra na API do Discord.
* `!delete-commands` - (Apenas Admin) Deleta todos os comandos de barra do servidor.

## 🚀 Como Configurar e Rodar o Projeto

### 1. Pré-requisitos
* [Node.js](https://nodejs.org/) (v16.11.0 ou superior)
* Conta no [Portal de Desenvolvedores do Discord](https://discord.com/developers/applications)
* Conta e chave de API do [The Movie Database (TMDB)](https://www.themoviedb.org/signup)

### 2. Instalação

1.  Clone o repositório:
    ```bash
    git clone [https://github.com/seu-usuario/Victor-Frankenstein.git](https://github.com/seu-usuario/Victor-Frankenstein.git)
    cd Victor-Frankenstein
    ```

2.  Instale as dependências:
    ```bash
    npm install
    ```

### 3. Configuração do `.env`

Crie um arquivo chamado `.env` na raiz do projeto e adicione as seguintes variáveis:

```env
# Token do seu Bot (Discord Developer Portal)
DISCORD_TOKEN=SEU_TOKEN_AQUI

# ID da Aplicação (Discord Developer Portal -> General Information)
APPLICATION_ID=SEU_APPLICATION_ID_AQUI

# ID do Servidor (Guild ID) onde você vai testar os comandos
SERVER_ID=SEU_SERVER_ID_AQUI

# Token de Leitura da API do TMDB (TMDB -> Configurações -> API)
# (Use o "Token de Leitura da API (v4 auth)" como Bearer Token)
TMDB_BEARER_TOKEN=SEU_TMDB_BEARER_TOKEN_AQUI