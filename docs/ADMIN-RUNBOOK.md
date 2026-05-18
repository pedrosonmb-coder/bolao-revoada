# Admin Runbook — Bolão Revoada

Guia operacional para Pedro durante a Copa 2026.

---

## Cenário 1 — Resultado errado pela API

**Sintoma:** Jogo terminou mas o placar no sistema está errado (api falhou ou teve delay).

**Diagnóstico:** Na aba **Sistema** do painel admin, veja "Football-data.org - Último sync". Se estiver desatualizado, tente "Recarregar fixtures agora".

**Solução:**
1. Acesse `/admin` no Mini App
2. Aba **Jogos** > filtre o jogo
3. Clique **Forçar resultado**
4. Preencha o placar correto + motivo (ex: "Correção após erro da API")
5. O sistema recalcula automaticamente os palpites e ranking

---

## Cenário 2 — User pagou mas não está marcado

**Sintoma:** Participante diz que pagou o bolão mas `paid_at = null`.

**Solução:**
1. Acesse `/admin` no Mini App
2. Aba **Usuários**
3. Localize o participante
4. Clique **Marcar pago**

Para desfazer: clique **Desmarcar**.

---

## Cenário 3 — Jogo cancelado (W.O.)

**Sintoma:** Jogo foi cancelado, adiado indefinidamente ou não vai acontecer.

**Regra:** Cada participante recebe a média de pontos que obteve nos outros jogos da mesma fase. Se não tiver nenhum outro, recebe 0.

**Solução:**
1. Acesse `/admin` > aba **Jogos**
2. Localize o jogo
3. Clique **W.O.**
4. Confirme e informe o motivo
5. Sistema aplica pontuação média automaticamente

**Idempotente:** pode rodar mais de uma vez sem problema.

---

## Cenário 4 — Bot mandou notificação repetida

**Sintoma:** Alguém reclamou de notificação duplicada no Telegram.

**Diagnóstico:** O sistema usa lock em `bot_messages` para garantir idempotência. Duplicatas só acontecem se o cron rodou antes do lock ser salvo (race condition extremamente raro).

**Solução:** Não há ação necessária além de aguardar. O lock já foi salvo e não enviará novamente. Se persistir, verifique os logs da Vercel para o endpoint suspeito.

---

## Cenário 5 — Como ver logs de erro de cron

**Opção 1 — Painel admin:**
1. `/admin` > aba **Sistema** > seção **Crons**
2. Mostra última execução e erro de cada cron

**Opção 2 — Vercel:**
1. Acesse vercel.com > projeto bolao-revoada
2. Aba **Logs** > filtre por função ou endpoint

**Opção 3 — Banco diretamente:**
```sql
SELECT * FROM polling_logs ORDER BY ran_at DESC LIMIT 20;
```

---

## Cenário 6 — Adicionar um décimo participante

**Pré-requisito:** O usuário precisa abrir o Mini App e se autenticar via Telegram (isso cria automaticamente o `users` record).

**Após autenticação:**
1. `/admin` > aba **Usuários** — verifique que o user apareceu
2. Se `is_active = false`, clique **Reativar**
3. Marque como pago se necessário

**Nota:** Se o bolão já começou, os palpites de jogos passados não podem ser criados retroativamente.

---

## Cenário 7 — Backup falhou

**Verificar:**
1. GitHub > Actions > Backup Database > ver run com falha
2. Causas comuns: `TURSO_AUTH_TOKEN` expirado, `TURSO_DATABASE_URL` errado

**Rodar manualmente:**
1. GitHub > Actions > Backup Database > **Run workflow** > Run
2. Ou localmente: `bash scripts/backup-database.sh` (com variáveis de ambiente)

Veja [docs/backup-restore.md](backup-restore.md) para instruções detalhadas.

---

## Cenário 8 — Recalcular tudo após correção grande

**Quando usar:** Você corrigiu múltiplos resultados ou há inconsistência no ranking.

**Solução:**
1. `/admin` > aba **Sistema**
2. Clique **Recalcular tudo**
3. Confirme na janela de confirmação
4. Aguarde (pode demorar ~30s para 104 jogos)

**Alternativa via curl (fora do Mini App):**
```bash
curl -X POST https://bolao-revoada.vercel.app/api/admin/recalculate \
  -H "x-admin-id: 6427948911" \
  -H "x-confirm: yes" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Acesso de emergência via curl

Substitua `6427948911` pelo seu telegram_id e use a URL de produção:

```bash
# Status do sistema
curl "https://bolao-revoada.vercel.app/api/admin/system-status" \
  -H "x-admin-id: 6427948911"

# Forçar resultado de um jogo (match_id = 42)
curl -X POST "https://bolao-revoada.vercel.app/api/admin/matches/42/override" \
  -H "x-admin-id: 6427948911" \
  -H "x-confirm: yes" \
  -H "Content-Type: application/json" \
  -d '{"home_score":2,"away_score":1,"reason":"Correção manual"}'

# Marcar user como pago (user_id = 3)
curl -X PATCH "https://bolao-revoada.vercel.app/api/admin/users/3" \
  -H "x-admin-id: 6427948911" \
  -H "Content-Type: application/json" \
  -d "{\"paid_at\":$(date +%s)}"
```
