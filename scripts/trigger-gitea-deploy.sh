#!/usr/bin/env sh
# Dispara o deploy no Gitea (CasaOS) após push no GitHub.
#
# O mirror do Gitea sincroniza o código mas NÃO executa Actions.
# Este script: sincroniza o mirror + dispara o workflow de deploy no Gitea.
#
# Variáveis obrigatórias:
#   GITEA_URL, GITEA_TOKEN, GITEA_OWNER, GITEA_REPO

set -eu

GITEA_URL="${GITEA_URL:?Defina GITEA_URL}"
GITEA_TOKEN="${GITEA_TOKEN:?Defina GITEA_TOKEN}"
GITEA_OWNER="${GITEA_OWNER:?Defina GITEA_OWNER}"
GITEA_REPO="${GITEA_REPO:?Defina GITEA_REPO}"

API="${GITEA_URL}/api/v1/repos/${GITEA_OWNER}/${GITEA_REPO}"
AUTH="Authorization: token ${GITEA_TOKEN}"

echo "==> Gitea deploy: ${GITEA_OWNER}/${GITEA_REPO}"

echo "==> Sincronizando mirror..."
curl -sf -X POST -H "${AUTH}" "${API}/mirror-sync" || \
    echo "AVISO: mirror-sync falhou — verifique se o repo é pull mirror."

sleep 5

echo "==> Disparando workflow de deploy..."
curl -sf -X POST \
    -H "${AUTH}" \
    -H "Content-Type: application/json" \
    -d '{"event_type":"deploy"}' \
    "${API}/dispatches"

echo ""
echo "==> OK — acompanhe: ${GITEA_URL}/${GITEA_OWNER}/${GITEA_REPO}/actions"
