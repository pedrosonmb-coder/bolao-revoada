#!/usr/bin/env bash
# Backup manual do banco Turso.
#
# Uso:
#   export TURSO_API_TOKEN="seu-api-token"      # token da plataforma (app.turso.tech)
#   export TURSO_DATABASE_NAME="bolao-revoada"  # só o nome curto, sem libsql:// ou domínio
#   bash scripts/backup-database.sh
#
# O arquivo backup-YYYY-MM-DD.sql.gz é criado no diretório atual.
# TURSO_API_TOKEN != TURSO_AUTH_TOKEN: o AUTH_TOKEN é do SDK do app, não do CLI.

set -euo pipefail

: "${TURSO_DATABASE_NAME:?Erro: TURSO_DATABASE_NAME não definido (ex: bolao-revoada)}"
: "${TURSO_API_TOKEN:?Erro: TURSO_API_TOKEN não definido (token da plataforma, não do SDK)}"

DATE=$(date -u +%Y-%m-%d)
BACKUP_FILE="backup-${DATE}.sql"

echo "Gerando dump: $TURSO_DATABASE_NAME"
turso db shell "$TURSO_DATABASE_NAME" ".dump" > "$BACKUP_FILE"

if [ ! -s "$BACKUP_FILE" ]; then
  echo "Erro: arquivo de backup vazio — dump pode ter falhado."
  rm -f "$BACKUP_FILE"
  exit 1
fi

gzip "$BACKUP_FILE"
echo "Backup criado: ${BACKUP_FILE}.gz ($(du -sh "${BACKUP_FILE}.gz" | cut -f1))"
