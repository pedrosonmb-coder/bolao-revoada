# Checklist pré-Copa — Bolão Revoada

## D-15 (27/05)

- [ ] Backup manual extra do banco via `bash scripts/backup-database.sh`
- [ ] Verificar GitHub Actions > Backup Database: último backup ok
- [ ] Confirmar que todos os 9 participantes têm `is_active = true` no painel admin

## D-10 (01/06)

- [ ] Smoke test em todos os endpoints principais:
  ```bash
  curl https://bolao-revoada.vercel.app/api/health
  ```
- [ ] Confirmar que `/admin` abre e mostra dados corretos no browser do Mini App

## D-7 (04/06)

- [ ] Confirmar todos os 9 amigos no grupo Telegram do bolão
- [ ] Todos marcados como pagos no painel admin
- [ ] Testar notificação manual (se tiver dry_run ativo, verificar que o dry_run está funcionando)

## D-3 (08/06)

- [ ] `pnpm test` → 25/25
- [ ] `pnpm test:notifications` → 12/12
- [ ] `pnpm test:scoring` → 16/16
- [ ] `pnpm build` sem erros

## D-1 (10/06)

- [ ] Ativar Job 2 no `vercel.json`: adicionar `poll-live-matches` ao crons se não estiver
- [ ] Ativar Job 3: adicionar `pre-match-reminder` ao crons
- [ ] `git push origin main` + verificar deploy na Vercel
- [ ] Testar poll-fixtures manualmente via painel admin > Sistema > "Recarregar fixtures agora"

## D-0 (11/06 — dia do primeiro jogo)

- [ ] **Manhã:** desativar `NOTIFICATIONS_DRY_RUN` na Vercel (Environment Variables)
  - Vercel > Settings > Environment Variables > remover `NOTIFICATIONS_DRY_RUN=true` ou setar para `false`
  - Fazer redeploy (Deployments > Redeploy)
- [ ] Ativar Job 4: verificar `post-match-summary` no crons (se não estiver)
- [ ] **12h:** confirmar que recebeu morning-digest no grupo
- [ ] **~17h (1h antes do MEX × RSA):** confirmar que recebeu pre-match reminder
- [ ] **Após o jogo:** confirmar que recebeu post-match summary com resultados

## Durante a Copa

- [ ] Monitorar `/api/health` via UptimeRobot (free, 5min interval)
  - URL: `https://bolao-revoada.vercel.app/api/health`
  - Alert: email quando status != 200
- [ ] Verificar painel admin (`/admin`) a cada 2-3 dias
- [ ] Backup automático diário funcionando (verificar uma vez por semana na aba Actions)

## Checklist de encerramento (após a final, 19/07)

- [ ] Inserir resultados do torneio via painel admin > Sistema > "Atualizar resultados de torneio"
- [ ] Recalcular tudo (painel admin > Sistema > "Recalcular tudo")
- [ ] Tirar screenshot do ranking final
- [ ] Confirmar transferência do prêmio
- [ ] Backup final do banco
