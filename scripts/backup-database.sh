#!/usr/bin/env bash
# Backup manual do banco Turso.
#
# Uso:
#   export TURSO_AUTH_TOKEN="seu-token"
#   export TURSO_DATABASE_URL="libsql://nome-org.aws-us-east-1.turso.io"
#   bash scripts/backup-database.sh
#
# O arquivo backup-YYYY-MM-DD.sql.gz é criado no diretório atual.

set -euo pipefail

: "${TURSO_DATABASE_URL:?Erro: TURSO_DATABASE_URL não definido}"
: "${TURSO_AUTH_TOKEN:?Erro: TURSO_AUTH_TOKEN não definido}"

DATE=$(date -u +%Y-%m-%d)
BACKUP_FILE="backup-${DATE}.sql"

echo "Gerando dump: $TURSO_DATABASE_URL"
turso db shell "$TURSO_DATABASE_URL" --auth-token "$TURSO_AUTH_TOKEN" ".dump" > "$BACKUP_FILE"

if [ ! -s "$BACKUP_FILE" ]; then
  echo "Erro: arquivo de backup vazio — dump pode ter falhado."
  rm -f "$BACKUP_FILE"
  exit 1
fi

gzip "$BACKUP_FILE"
echo "Backup criado: ${BACKUP_FILE}.gz ($(du -sh "${BACKUP_FILE}.gz" | cut -f1))"
