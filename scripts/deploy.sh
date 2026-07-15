#!/usr/bin/env sh
set -eu

DEPLOY_DIR="${DEPLOY_DIR:-/DATA/AppData/victor-frankenstein}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yaml}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "==> Deploy Victor-Frankenstein"
echo "    Diretório: ${DEPLOY_DIR}"
echo "    Tag: ${IMAGE_TAG}"

cd "${DEPLOY_DIR}"

if [ ! -f "${COMPOSE_FILE}" ]; then
    echo "ERRO: ${COMPOSE_FILE} não encontrado em ${DEPLOY_DIR}"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "AVISO: .env não encontrado. Certifique-se de que as variáveis estão configuradas no CasaOS."
fi

export IMAGE_TAG

docker compose -f "${COMPOSE_FILE}" build --pull
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

docker compose -f "${COMPOSE_FILE}" ps
echo "==> Deploy concluído"
