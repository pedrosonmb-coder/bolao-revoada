#!/usr/bin/env bash
# Backup manual do banco Turso.
#
# Uso:
#   export TURSO_API_TOKEN="seu-api-token"        # token da plataforma (app.turso.tech)
#   export TURSO_DATABASE_URL="libsql://nome-org.aws-us-east-1.turso.io"
#   bash scripts/backup-database.sh
#
# O arquivo backup-YYYY-MM-DD.sql.gz é criado no diretório atual.
# TURSO_API_TOKEN é diferente de TURSO_AUTH_TOKEN (esse é o token do SDK do app).

set -euo pipefail

: "${TURSO_DATABASE_URL:?Erro: TURSO_DATABASE_URL não definido}"
: "${TURSO_API_TOKEN:?Erro: TURSO_API_TOKEN não definido (diferente de TURSO_AUTH_TOKEN)}"

DATE=$(date -u +%Y-%m-%d)
BACKUP_FILE="backup-${DATE}.sql"

echo "Gerando dump: $TURSO_DATABASE_URL"
turso db shell "$TURSO_DATABASE_URL" ".dump" > "$BACKUP_FILE"

if [ ! -s "$BACKUP_FILE" ]; then
  echo "Erro: arquivo de backup vazio — dump pode ter falhado."
  rm -f "$BACKUP_FILE"
  exit 1
fi

gzip "$BACKUP_FILE"
echo "Backup criado: ${BACKUP_FILE}.gz ($(du -sh "${BACKUP_FILE}.gz" | cut -f1))"
