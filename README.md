# Victor-Frankenstein (Bot para Discord)

Victor-Frankenstein é um bot para Discord focado em entretenimento, construído com Node.js e a biblioteca [Discord.js](https://discord.js.org/). Sua principal funcionalidade é se conectar à API do The Movie Database (TMDB) para fornecer informações detalhadas sobre filmes, séries e celebridades através de uma interface de menu interativa.

## ✨ Funcionalidades

### Comando Principal
* **/menu**
    * Abre a interface principal de busca do bot.
    * Permite ao usuário escolher o que deseja pesquisar (Filme, Série ou Pessoa) através de um menu *dropdown*.
    * Abre um formulário (modal) para o usuário inserir o termo de busca.
    * Exibe os resultados em uma interface de paginação avançada, com botões para navegar entre resultados e páginas da API.

### Comandos de Atalho (Slash Commands)
Para acesso mais rápido, os comandos individuais também funcionam:

* `/filme [titulo]` - Busca diretamente por um filme.
* `/serie [titulo]` - Busca diretamente por uma série de TV.
* `/pessoa [nome]` - Busca diretamente por um ator, atriz ou diretor.
* `/ajuda` - Exibe uma mensagem com a lista de todos os comandos.

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

# Chave da API Google Gemini (Google AI Studio)
GOOGLE_API_KEY=SUA_GOOGLE_API_KEY_AQUI

# Modo de deploy automático: none | guild | global | guild-then-global
DEPLOY_MODE=guild
```

Para a lista completa de variáveis e deploy em produção, consulte [DEPLOY.md](DEPLOY.md) e [.env.example](.env.example).