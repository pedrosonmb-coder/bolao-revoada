# Backup e Restore — Bolão Revoada

## Backups automáticos

O workflow `.github/workflows/backup-database.yml` roda todo dia às 06:00 UTC (03:00 BRT) e salva um dump compactado como GitHub Release privado.

### Acessar backups

1. Acesse a aba **Releases** do repositório no GitHub
2. Releases com prefixo `backup-YYYY-MM-DD` contêm o dump do banco daquele dia
3. Faça download do arquivo `.sql.gz`

### Retenção

Backups mais antigos que 30 dias são deletados automaticamente pelo workflow.

---

## Backup manual

Requer Turso CLI instalado e as variáveis de ambiente configuradas:

```bash
export TURSO_DATABASE_URL="libsql://..."
export TURSO_AUTH_TOKEN="..."

bash scripts/backup-database.sh
```

Gera `backup-YYYY-MM-DD.sql.gz` no diretório atual.

---

## Restore

### Pré-requisitos

- Turso CLI instalado: `curl -sSfL https://get.tur.so/install.sh | bash`
- Credenciais do banco configuradas

### Passos

```bash
# 1. Descompactar o backup
gunzip backup-2026-06-11.sql.gz

# 2. Aplicar no banco de destino (CUIDADO: sobrescreve dados!)
turso db shell libsql://seu-banco.turso.io \
  --auth-token SEU_TOKEN \
  < backup-2026-06-11.sql

# 3. Verificar
turso db shell libsql://seu-banco.turso.io \
  --auth-token SEU_TOKEN \
  "SELECT COUNT(*) FROM users;"
```

### Restore em banco local (SQLite)

```bash
gunzip backup-2026-06-11.sql.gz
sqlite3 local.db < backup-2026-06-11.sql
```

---

## Secrets necessários no GitHub

Para o workflow funcionar, configure em **Settings > Secrets and variables > Actions**:

| Secret | Status | Onde encontrar |
|---|---|---|
| `TURSO_AUTH_TOKEN` | ✅ configurado | `turso auth token` ou dashboard Turso |
| `TURSO_DATABASE_URL` | ✅ configurado | `turso db show bolao-revoada --url` |
| `GITHUB_TOKEN` | automático | Disponível automaticamente no Actions |

---

## Forçar backup manualmente

Na aba **Actions** do GitHub, selecione **Backup Database** e clique em **Run workflow**.
