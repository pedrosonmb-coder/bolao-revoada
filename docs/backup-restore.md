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
export TURSO_API_TOKEN="..."        # token da plataforma, NÃO o TURSO_AUTH_TOKEN do app
export TURSO_DATABASE_NAME="bolao-revoada"  # nome curto, sem libsql:// ou domínio

bash scripts/backup-database.sh
```

Gera `backup-YYYY-MM-DD.sql.gz` no diretório atual.

---

## Restore

### Pré-requisitos

- Turso CLI instalado: `curl -sSfL https://get.tur.so/install.sh | bash`
- `TURSO_API_TOKEN` configurado no ambiente

### Passos

```bash
# 1. Descompactar o backup
gunzip backup-2026-06-11.sql.gz

# 2. Aplicar no banco de destino (CUIDADO: sobrescreve dados!)
export TURSO_API_TOKEN="..."
turso db shell libsql://seu-banco.turso.io < backup-2026-06-11.sql

# 3. Verificar
turso db shell libsql://seu-banco.turso.io "SELECT COUNT(*) FROM users;"
```

### Restore em banco local (SQLite)

```bash
gunzip backup-2026-06-11.sql.gz
sqlite3 local.db < backup-2026-06-11.sql
```

---

## Secrets necessários no GitHub

Configure em **Settings > Secrets and variables > Actions**:

| Secret | Status | Descrição |
|---|---|---|
| `TURSO_AUTH_TOKEN` | ✅ configurado | Token do SDK libsql — usado **pelo app** em produção |
| `TURSO_DATABASE_URL` | ✅ configurado | URL do banco (`libsql://...turso.io`) — usado **pelo app** |
| `TURSO_API_TOKEN` | ✅ configurado | Token da plataforma Turso — usado **pelo CLI de backup** |
| `TURSO_DATABASE_NAME` | ✅ configurado | Nome curto do banco (ex: `bolao-revoada`) — usado **pelo CLI de backup** |
| `GITHUB_TOKEN` | automático | Disponível automaticamente no Actions |

### Diferença entre os tokens

- **`TURSO_AUTH_TOKEN`**: token de banco de dados, gerado via `turso db tokens create bolao-revoada`. Usado pelo SDK do app (`@libsql/client`) para conectar ao banco. **Não funciona com o CLI.**
- **`TURSO_API_TOKEN`**: token de plataforma, gerado em **app.turso.tech → Account → API Tokens → Create Token**. Autentica o CLI Turso (`turso db shell`, `turso db list`, etc.). **Não funciona como token do SDK.**

---

## Forçar backup manualmente

Na aba **Actions** do GitHub, selecione **Backup Database** e clique em **Run workflow**.
