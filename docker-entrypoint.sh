#!/bin/sh
set -eu

# Corrige permissões do volume bind-mount (criado como root no host)
if [ -d /usr/src/app/data ]; then
    chown -R node:node /usr/src/app/data
    chmod -R u+rwX /usr/src/app/data
fi

exec su-exec node "$@"
