#!/usr/bin/env bash
# Backup manual do banco Turso. Requer TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no ambiente.
# Uso: bash scripts/backup-database.sh

set -euo pipefail

if [[ -z "${TURSO_DATABASE_URL:-}" ]]; then
  echo "Erro: TURSO_DATABASE_URL não definido"
  exit 1
fi

if [[ -z "${TURSO_AUTH_TOKEN:-}" ]]; then
  echo "Erro: TURSO_AUTH_TOKEN não definido"
  exit 1
fi

DATE=$(date +%Y-%m-%d_%H-%M)
OUTPUT="backup-${DATE}.sql"

echo "Gerando dump do banco Turso..."
turso db shell "$TURSO_DATABASE_URL" --auth-token "$TURSO_AUTH_TOKEN" ".dump" > "$OUTPUT"

echo "Compactando..."
gzip "$OUTPUT"

echo "Backup criado: ${OUTPUT}.gz ($(du -sh "${OUTPUT}.gz" | cut -f1))"
