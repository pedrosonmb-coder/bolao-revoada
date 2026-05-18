# Configuração dos Crons em cron-job.org

Após o deploy da Fase 2 na Vercel, cadastrar estes 3 jobs em https://cron-job.org:

## Job 1: Poll de jogos ao vivo

- **Title:** Bolão - Poll Live Matches
- **URL:** `https://bolao-revoada.vercel.app/api/cron/poll-live-matches`
- **Schedule:** Every 1 minute
- **Request Method:** GET
- **Headers (Advanced):**
  - `Authorization: Bearer <CRON_SECRET>`
- **Enabled:** SIM, mas só ATIVAR a partir de **10/06/2026** (1 dia antes da Copa).
  Antes disso, manter desabilitado para não gerar logs desnecessários.

## Job 2: Poll de fixtures (mudanças de horário)

- **Title:** Bolão - Poll Fixtures
- **URL:** `https://bolao-revoada.vercel.app/api/cron/poll-fixtures`
- **Schedule:** Every hour (minute 0)
- **Request Method:** GET
- **Headers:** `Authorization: Bearer <CRON_SECRET>`
- **Enabled:** SIM, ativar a partir de **01/06/2026** (com os palpites abrindo)

## Job 3: Pre-match reminder (grupo + DM para quem não palpitou)

- **Title:** Bolão - Pre-Match Reminder
- **URL:** `https://bolao-revoada.vercel.app/api/cron/pre-match-reminder`
- **Schedule:** Every 5 minutes
- **Request Method:** GET
- **Headers:** `Authorization: Bearer <CRON_SECRET>`
- **Enabled:** Ativar a partir de **01/06/2026** (quando os palpites abrem)

## Job 4: Post-match summary (resultado + ranking no grupo)

- **Title:** Bolão - Post-Match Summary
- **URL:** `https://bolao-revoada.vercel.app/api/cron/post-match-summary`
- **Schedule:** Every 5 minutes
- **Request Method:** GET
- **Headers:** `Authorization: Bearer <CRON_SECRET>`
- **Enabled:** Ativar a partir de **11/06/2026** (início da Copa)

---

## Onde achar o CRON_SECRET

O valor está nas variáveis de ambiente da Vercel:
`Settings → Environment Variables → CRON_SECRET`

Também está no `.env.local` local (não commitar).

## Verificando se os crons estão funcionando

Acesse `https://bolao-revoada.vercel.app/api/admin/polling-status` com o header:
```
x-admin-id: <seu_telegram_id>
```

O campo `recent_logs` mostra as últimas 50 execuções de cron com timestamps e contadores.
