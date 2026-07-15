# Deploy no CasaOS (self-hosted)

Este guia descreve como implantar o **Victor-Frankenstein** no seu servidor CasaOS, com deploy automatizado via Gitea (espelho do GitHub).

## Arquitetura (deploy exclusivo no Gitea)

```
GitHub (push) → mirror Gitea (sincroniza código)
                      ↓
              trigger-gitea-deploy.sh  ← webhook ou manual
                      ↓
              Gitea Actions (runner no CasaOS)
                      ↓
              Docker no CasaOS
```

O deploy **sempre roda no Gitea**, nunca no GitHub. O workflow fica em `.gitea/workflows/deploy.yml`.
O `.github/workflows/ci.yml` apenas valida o código no GitHub — não faz deploy.

O bot Discord **não expõe porta HTTP** — ele se conecta à API do Discord de forma outbound. Não é necessário mapear portas.

## Pré-requisitos no CasaOS

1. **Docker** e **Docker Compose** (já inclusos no CasaOS)
2. **Gitea** com mirror do repositório GitHub configurado
3. **Gitea Actions** habilitado com um **runner self-hosted** no mesmo host (ou com acesso ao Docker socket)
4. Tokens/chaves:
   - Discord: `DISCORD_TOKEN`, `APPLICATION_ID`
   - TMDB: `TMDB_BEARER_TOKEN`
   - Google Gemini: `GOOGLE_API_KEY`

## Variáveis de ambiente

### Secrets (obrigatórios)

| Variável | Descrição |
|----------|-----------|
| `DISCORD_TOKEN` | Token do bot (Discord Developer Portal) |
| `APPLICATION_ID` | ID da aplicação Discord |
| `TMDB_BEARER_TOKEN` | Token Bearer v4 da API TMDB |
| `GOOGLE_API_KEY` | Chave da API Google Gemini |

### Configuração (opcionais, com defaults)

| Variável | Default | Descrição |
|----------|---------|-----------|
| `SERVER_ID` | — | ID do servidor Discord (obrigatório se `DEPLOY_MODE=guild`) |
| `DEPLOY_MODE` | `guild` | `none`, `guild`, `global`, `guild-then-global` |
| `GEMINI_MODEL_NAME` | `gemini-2.5-flash` | Modelo Gemini |
| `GEMINI_SYSTEM_INSTRUCTION` | (persona padrão) | Instrução de sistema do Gemini |
| `COMMAND_PREFIX` | `!` | Prefixo dos comandos de texto |
| `DATA_DIR` | `data` | Diretório de áudios baixados |
| `TMDB_LANGUAGE` | `pt-BR` | Idioma da API TMDB |
| `TMDB_WATCH_REGION` | `BR` | Região de streaming TMDB |
| `YTDLP_COMMAND` | `yt-dlp` | Comando yt-dlp |
| `MEMORY_LIMIT` | `1024M` | Limite de memória do container |
| `IMAGE_TAG` | `latest` | Tag da imagem Docker |
| `APP_DATA_PATH` | `/DATA/AppData/victor-frankenstein` | Caminho de dados no host |

Copie `.env.example` para `.env` e preencha os valores para deploy manual.

## Opção 1: Deploy manual via CasaOS

### 1. Preparar diretório

```bash
mkdir -p /DATA/AppData/victor-frankenstein/data
cd /DATA/AppData/victor-frankenstein
git clone https://seu-gitea/usuario/Victor-Frankenstein.git .
cp .env.example .env
# Edite .env com seus secrets
```

### 2. Instalar via CasaOS

1. Abra **CasaOS** → **App Store** → **Custom Install**
2. Importe o `docker-compose.yaml` do repositório
3. Configure as variáveis de ambiente na interface (secrets)
4. Inicie o app

### 3. Build e start manual

```bash
cd /DATA/AppData/victor-frankenstein
docker compose up -d --build
```

### 4. Verificar logs

```bash
docker compose logs -f victor-frankenstein
```

## Opção 2: Deploy via Gitea Actions (recomendado)

### Importante: mirror não dispara Actions sozinho

O pull mirror do Gitea **sincroniza o código** mas **não executa** workflows. O deploy no CasaOS precisa ser disparado explicitamente no Gitea.

### 1. Habilitar Actions no repositório

No Gitea: **Settings → Advanced → Repository Units** → habilite **Actions**.

### 2. Configurar mirror GitHub → Gitea

No Gitea, crie um repositório espelho apontando para:
`https://github.com/AglailsonCleber/Victor-Frankenstein`

### 2. Registrar runner self-hosted

No Gitea: **Settings → Actions → Runners** → registre um runner no host CasaOS com label `self-hosted`.

O runner precisa de acesso ao Docker:

```bash
# Adicione o usuário do runner ao grupo docker
sudo usermod -aG docker <usuario-do-runner>
```

### 3. Configurar secrets no Gitea

Em **Repositório → Settings → Secrets**, adicione:

- `DISCORD_TOKEN`
- `APPLICATION_ID`
- `SERVER_ID`
- `TMDB_BEARER_TOKEN`
- `GOOGLE_API_KEY`

### 4. Configurar variables (opcionais)

Em **Settings → Actions → Variables**:

| Variable | Valor sugerido |
|----------|----------------|
| `DEPLOY_MODE` | `guild` (teste) ou `global` (produção) |
| `MEMORY_LIMIT` | `1024M` |
| `APP_DATA_PATH` | `/DATA/AppData/victor-frankenstein` |

### 5. Disparar o deploy no Gitea

**Manual (após sync do mirror):**

1. **Settings → Mirror → Sync Now**
2. **Actions → Deploy to CasaOS → Run workflow**

**Automático (após cada push no GitHub):**

Configure um webhook no GitHub que executa no CasaOS:

```bash
# No servidor CasaOS — variáveis de ambiente
export GITEA_URL="https://seu-gitea.exemplo.com"
export GITEA_TOKEN="token_com_escopo_write:repository"
export GITEA_OWNER="seu-usuario"
export GITEA_REPO="Victor-Frankenstein"

./scripts/trigger-gitea-deploy.sh
```

No GitHub: **Settings → Webhooks → Add webhook**
- URL: endpoint no CasaOS que roda o script acima
- Events: `push`

**Push direto no Gitea** (sem webhook): se você der `git push` direto no remote do Gitea, o workflow dispara automaticamente via `on: push`.

### 6. O que o workflow faz

1. Copia o código para `/DATA/AppData/victor-frankenstein`
2. Gera `.env` a partir dos secrets do **Gitea**
3. Executa `docker compose build` + `up -d` no CasaOS

## Modos de deploy de comandos

| `DEPLOY_MODE` | Comportamento |
|---------------|---------------|
| `none` | Não registra slash commands ao iniciar |
| `guild` | Registra apenas no `SERVER_ID` (instantâneo, ideal para testes) |
| `global` | Registra globalmente (propagação até 1h) |
| `guild-then-global` | Registra nos dois (multi-servidor) |

Para produção em múltiplos servidores, use `DEPLOY_MODE=global`.
Para desenvolvimento/testes no seu servidor, use `DEPLOY_MODE=guild` com `SERVER_ID` do seu Discord.

## Volumes e persistência

Apenas o diretório de dados é montado no host:

```
/DATA/AppData/victor-frankenstein/data → /usr/src/app/data
```

Áudios baixados pelo yt-dlp ficam neste volume. O código roda dentro da imagem Docker (não há bind mount do código-fonte).

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Bot não inicia | Verifique logs: `docker compose logs victor-frankenstein` |
| `Variáveis obrigatórias ausentes` | Confira secrets no CasaOS ou `.env` |
| Comandos `/` não aparecem | Verifique `DEPLOY_MODE` e `SERVER_ID` |
| Erro TMDB 401 | Confira `TMDB_BEARER_TOKEN` (use o token v4 Bearer, não API key v3) |
| Erro Gemini | Confira `GOOGLE_API_KEY` |
| Pipeline não inicia após push GitHub | Normal — mirror não dispara Actions. Use **Run workflow** ou `trigger-gitea-deploy.sh` |
| `Waiting for a runner` | Runner offline — execute `act_runner daemon` no CasaOS |
| yt-dlp permission denied | `sudo chown -R 1000:1000 /DATA/AppData/victor-frankenstein/data` e redeploy |

## CI no GitHub

O workflow `.github/workflows/ci.yml` valida o projeto no GitHub (sintaxe, módulo de env, docker compose config). O deploy de produção roda no Gitea/CasaOS.

## Atualização

**Manual:**
```bash
cd /DATA/AppData/victor-frankenstein
git pull
docker compose up -d --build
```

**Via Gitea:** Actions → Run workflow, ou `./scripts/trigger-gitea-deploy.sh` após push no GitHub.
