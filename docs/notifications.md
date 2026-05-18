# Notificações automáticas — Bolão do Revoada

## Visão geral

Todas as notificações usam lock distribuído via `bot_messages (type, sent_to)` — envio duplo é impossível mesmo com retries ou redeploys simultâneos.

Modo de teste: `NOTIFICATIONS_DRY_RUN=true` faz o sistema logar em vez de enviar.

---

## Tipos de notificação

### `morning_digest`
- **O quê:** Lista os jogos do dia + menciona quem ainda não palpitou
- **Quem dispara:** Vercel Cron (`/api/cron/morning-digest`)
- **Frequência:** 9h BRT (12:00 UTC)
- **Destino:** Grupo do Telegram
- **Chave de lock:** `morning_digest:YYYY-MM-DD`
- **Pula se:** não há jogos no dia

### `evening_summary`
- **O quê:** Resumo dos resultados do dia + top 3 do ranking
- **Quem dispara:** Vercel Cron (`/api/cron/evening-summary`)
- **Frequência:** 23h BRT (02:00 UTC do dia seguinte)
- **Destino:** Grupo
- **Chave:** `evening_summary:YYYY-MM-DD`
- **Pula se:** nenhum jogo foi finalizado no dia

### `pre_match_top`
- **O quê:** Alerta pré-jogo para top games (BRA joga, mata-mata, ou único jogo do dia)
- **Quem dispara:** cron-job.org (`/api/cron/pre-match-reminder`, cada 5 min)
- **Janela:** jogo entre 25 e 35 min à frente
- **Destino:** Grupo
- **Chave:** `pre_match_top:match_<id>`

### `pre_match_dm`
- **O quê:** DM individual para usuários que não palpitaram (todos os jogos)
- **Quem dispara:** mesmo cron de pre-match-reminder
- **Destino:** DM do usuário (telegram_id)
- **Chave:** `pre_match_dm:match_<id>:user_<id>`
- **Nota:** Usuário que bloqueou o bot → falha permanente registrada em `bot_messages.payload`, sem retry

### `post_match_top`
- **O quê:** Resultado do jogo + top 3 ranking pós-jogo
- **Quem dispara:** cron-job.org (`/api/cron/post-match-summary`, cada 5 min)
- **Janela:** jogos finalizados na última hora sem notificação
- **Destino:** Grupo (somente top games)
- **Chave:** `post_match_top:match_<id>`

### `phase_open`
- **O quê:** Avisa abertura de palpites para a próxima fase (mata-mata)
- **Quem dispara:** automaticamente em `applyReconciliation` quando o último jogo de uma fase é locked
- **Destino:** Grupo
- **Chave:** `phase_open:<stage>` (ex: `phase_open:r32`)

### `reconciliation_alert`
- **O quê:** Alerta para o admin sobre conflito persistente entre fontes
- **Quem dispara:** `applyReconciliation` quando `disagreement_count >= 5`
- **Destino:** DM de cada admin (ADMIN_TELEGRAM_IDS)
- **Chave:** `reconciliation_alert:match_<id>:YYYY-MM-DD`

---

## Como testar localmente

### Teste unitário (sem Telegram):
```bash
pnpm test:notifications
```
Roda com `NOTIFICATIONS_DRY_RUN=true` — logs no terminal, sem envio real.

### Teste de endpoint individual:
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  http://localhost:3000/api/cron/morning-digest
```

### Forçar envio real em dev:
```bash
NOTIFICATIONS_DRY_RUN=false dotenv -e .env.local -- tsx src/scripts/test-notifications.ts
```
⚠️ Isso envia mensagens reais no grupo.

---

## Debug

### Ver todas as notificações enviadas:
```sql
SELECT type, sent_to, sent_at, telegram_message_id, payload
FROM bot_messages
ORDER BY sent_at DESC
LIMIT 50;
```

### Ver conflitos de um match específico:
```sql
SELECT disagreement_count, status, result_locked_at
FROM matches
WHERE id = <match_id>;
```

### Verificar se um lock está travado (falha permanente):
```sql
SELECT * FROM bot_messages
WHERE type = 'pre_match_dm'
  AND sent_to LIKE '%user_<id>%'
  AND payload LIKE '%failed%';
```

---

## Arquitetura

```
Vercel Cron (2x/dia)
  └─ morning-digest → queries.ts → send.ts → bot.api
  └─ evening-summary → queries.ts → send.ts → bot.api

cron-job.org (a cada 5 min)
  └─ pre-match-reminder → queries.ts → send.ts → bot.api (grupo + DMs)
  └─ post-match-summary → queries.ts → send.ts → bot.api (grupo)

reconciliation.ts (lock automático)
  └─ phase-open.ts → send.ts → bot.api (grupo)
  └─ admin-alert.ts → send.ts → bot.api (DM admin)
```
