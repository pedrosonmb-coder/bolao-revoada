# Bolão do Revoada — Especificação Técnica (v2)

> Fonte única de verdade. Toda decisão de produto, regras de negócio, contratos de dados e arquitetura estão aqui. Consulte antes de implementar qualquer fase.
>
> **Atualização v2 (15/05/2026)**: correção do erro matemático de jogos por fase, inclusão de `match_snapshots` e `polling_logs`, retorno das 4 fontes de dados (football-data primária + FIFA + ge.globo + Wikipedia), remoção de `keep-alive`, definição de `phase_windows.opens_at` da fase de grupos.

---

## 1. Produto

- **Nome:** Bolão do Revoada
- **Tipo:** Bolão privado da Copa do Mundo FIFA 2026 para 9 amigos + organizador (10 participantes)
- **Bolo:** R$ 1.000 (R$ 100 × 10 participantes)
- **Período de operação:** 01/06/2026 (abertura de palpites) → 19/07/2026 (premiação após apuração final)
- **Orçamento operacional máximo:** R$ 50. Tudo precisa rodar em tier gratuito.

## 2. Stack técnico

| Camada | Tecnologia | Por quê |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Full-stack em uma linguagem, deploy zero-fricção na Vercel |
| UI | Tailwind CSS 4 + shadcn/ui (componentes selecionados) | Mobile-first, dark mode nativo, copy-paste |
| Banco | Turso (libSQL/SQLite serverless) | Free tier generoso (1B reads/mês), SQL puro |
| ORM | Drizzle ORM | Leve, type-safe, schema-first |
| Hospedagem | Vercel (Hobby tier) | Free, timeout 10s, deploy automático |
| Cron frequente | cron-job.org (grátis, ilimitado) | HTTP cron a cada 1 min, sem cartão, sem limite |
| Cron diário | Vercel Cron (Hobby tier) | Hobby suporta execução diária |
| Cron backup | GitHub Actions | Diário, gratuito, 2000 min/mês |
| Bot Telegram | grammY (Node.js) | Mais ergonômico que telegraf |
| Auth | Telegram Mini App initData (HMAC) | Sem login, identidade vem do Telegram |
| LLM | Claude Haiku 4.5 via @anthropic-ai/sdk | Recap semanal, único uso de IA em runtime (~US$ 0,15 a Copa toda) |
| Fontes de dados | football-data.org (primária) + FIFA API + ge.globo + Wikipedia | 4 camadas, redundância máxima |

## 3. Identidade visual

### Palette

**Light mode:**
- `bg-base`: `#FFFFFF`
- `bg-surface`: `#F5F5F5`
- `border`: `#E5E5E5`
- `text-primary`: `#0A0A0A`
- `text-secondary`: `#737373`
- `accent-primary` (azul FIFA): `#0A2D82`
- `accent-critical` (vermelho Copa 2026): `#E10600`

**Dark mode:**
- `bg-base`: `#0A0A0A`
- `bg-surface`: `#1A1A1A`
- `border`: `#2A2A2A`
- `text-primary`: `#FAFAFA`
- `text-secondary`: `#A3A3A3`
- `accent-primary`: `#3D5FBF`
- `accent-critical`: `#FF1F1F`

### Tipografia
- UI/corpo: **Inter** (Google Fonts)
- Números grandes (placares, pontos, posições): **Inter Tight** peso 800 (Black)

### Sistema de estado (sem semântica colorida)
- Palpite pendente: card normal, ícone "?" cinza
- Palpite salvo: card com ✓ preto + placar em peso bold
- Palpite fechado/travado: opacidade 60% + ícone de cadeado
- Jogo ao vivo: ponto vermelho pulsante + label "AO VIVO"
- Ranking subindo: seta ↑ preta + número
- Ranking descendo: seta ↓ preta + número
- Sua posição no ranking: destaque em azul FIFA

### Tema do Mini App
Segue automaticamente o tema do Telegram do usuário via `tg.colorScheme`. Sem toggle manual.

### Logo
"BOLÃO DO REVOADA" em Inter Tight Black, all caps. Branco no dark, preto no light. Sem ícone.

## 4. Regulamento (lógica de negócio)

### 4.1 Pontuação por jogo — fase de grupos
Hierárquica, apenas o melhor critério atingido:

| Acerto | Pontos |
|---|---|
| Placar exato | 25 |
| Vencedor + saldo correto | 18 |
| Vencedor + gols do vencedor corretos | 15 |
| Vencedor + gols do perdedor corretos | 12 |
| Só o vencedor (ou só o empate) | 10 |
| Errou o vencedor | 0 |

### 4.2 Pontuação no mata-mata
Mesma tabela acima + **+5 pontos** se acertou quem se classificou (independente do placar).

### 4.3 Multiplicadores por fase

| Fase | Multiplicador |
|---|---|
| Fase de grupos | x1 |
| 16-avos (r32) | x1,5 |
| Oitavas (r16) | x2 |
| Quartas (qf) | x2,5 |
| Semifinais (sf) | x3 |
| Disputa de 3º lugar (3rd) | x2 |
| Final | x4 |

Aplicado sobre o total do jogo (placar + bônus de classificação).

### 4.4 Palpites de torneio

| Palpite | Pontos |
|---|---|
| Campeão | 100 |
| Vice-campeão | 50 |
| Outros 2 semifinalistas (além de campeão e vice) | 25 cada |
| Artilheiro da Copa | 50 |
| Melhor jogador (Bola de Ouro Adidas) | 50 |
| Melhor jovem (Young Player Award FIFA) | 25 |

Máximo possível: 325 pontos. (Campeão e vice já contam como 2 dos 4 semifinalistas — os outros 2 valem 25 pts cada.)

### 4.5 Janelas de palpite

| Bloco | Abre em | Fecha em |
|---|---|---|
| Torneio + 72 jogos de grupos | **01/06/2026 00:00 BRT** | 5 min antes do apito de abertura (11/06/2026) |
| 16-avos | Após último jogo de grupos | 5 min antes do 1º jogo dos 16-avos |
| Oitavas | Após último jogo dos 16-avos | 5 min antes do 1º jogo das oitavas |
| Quartas | Após último jogo das oitavas | 5 min antes do 1º jogo das quartas |
| Semifinais | Após último jogo das quartas | 5 min antes do 1º jogo das semis |
| 3º lugar + Final | Após último jogo das semis | 5 min antes do jogo de 3º lugar |

Após fechamento, palpite é imutável (validação server-side com timestamp). Não palpitou = 0 pontos naquele jogo.

### 4.6 Pagamento de inscrição
- Valor: R$ 100 por participante via Pix
- Prazo: até **10/06/2026 23:59 BRT** (1 dia antes da Copa)
- Quem não pagou até o prazo: `is_active = false`, palpites bloqueados, fica fora do ranking
- Registro: admin marca manualmente no painel (`POST /api/admin/user/:id/payment`)

### 4.7 Regras operacionais
- Prorrogação conta para placar; pênaltis **não** contam para placar (contam só para bônus de classificação)
- Palpites alheios ocultos até o apito do jogo
- Resultado oficial: ≥2 fontes concordando por 10 min consecutivos
- Todo horário interno em UTC; exibição em UTC−3 (Brasília)

### 4.8 Critérios de desempate (em ordem)
1. Mais vencedores acertados
2. Mais placares exatos
3. Mais pontos em palpites de torneio
4. Quem palpitou primeiro (fase de grupos, ordem cronológica)
5. Cara ou coroa via `crypto.randomInt`

### 4.9 Premiação
- 1º lugar: R$ 700 (70%)
- 2º lugar: R$ 200 (20%)
- 3º lugar: R$ 100 (10%)

Pagamento até 7 dias úteis após apuração final (aguarda saída dos prêmios FIFA, ~48h após a final).

### 4.10 Jogo cancelado (W.O.)
Admin marca `status = 'cancelled'`. Cada palpite naquele jogo recebe a média dos pontos do usuário em jogos da mesma fase.

## 5. Modelo de dados (schema Drizzle)

### Tabela: `users`
```ts
{
  id: integer (PK, autoincrement)
  telegram_id: integer (UNIQUE, NOT NULL)
  telegram_username: text
  first_name: text (NOT NULL)
  last_name: text
  photo_url: text
  is_admin: boolean (default false)
  is_active: boolean (default true)
  paid_at: timestamp
  created_at: timestamp (default now)
  updated_at: timestamp
}
```

### Tabela: `matches`
```ts
{
  id: integer (PK, autoincrement)
  fifa_id: text                              // ID na API da FIFA (nullable, populado quando disponível)
  fd_id: integer (UNIQUE, NOT NULL)          // ID na football-data.org (fonte primária)
  stage: text (NOT NULL)                     // 'group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'
  group_name: text                           // 'A' a 'L' (só fase de grupos)
  match_number: integer                      // 1 a 104, ordem cronológica
  home_team_code: text (NOT NULL)            // 'BRA', 'ARG', 'TBD' (mata-mata antes do sorteio)
  home_team_name: text (NOT NULL)
  away_team_code: text (NOT NULL)
  away_team_name: text (NOT NULL)
  kickoff_at: timestamp (NOT NULL)           // UTC
  venue: text
  city: text
  country: text                              // 'USA', 'MEX', 'CAN'
  status: text (default 'scheduled')         // 'scheduled', 'live', 'finished', 'postponed', 'cancelled'
  home_score: integer
  away_score: integer
  home_score_pen: integer
  away_score_pen: integer
  winner_code: text                          // 'home', 'away', 'draw'
  qualified_team_code: text                  // quem passou (só mata-mata)
  result_locked_at: timestamp                // quando virou oficial
  predictions_close_at: timestamp (NOT NULL) // kickoff_at - 5 min
  last_fd_payload: text                      // JSON da última resposta da football-data (debug)
  last_fifa_payload: text                    // JSON da última resposta da FIFA (debug)
}
```

### Tabela: `match_snapshots` (histórico de reconciliação) **[NOVA]**
```ts
{
  id: integer (PK, autoincrement)
  match_id: integer (FK matches, NOT NULL)
  source: text (NOT NULL)                    // 'football-data', 'fifa', 'ge', 'wikipedia'
  status: text                               // status reportado pela fonte
  home_score: integer
  away_score: integer
  home_score_pen: integer
  away_score_pen: integer
  raw_payload: text                          // JSON completo da resposta
  fetched_at: timestamp (NOT NULL)
}
```
Índice em `(match_id, fetched_at DESC)`. Retenção: apaga snapshots de jogos com `result_locked_at IS NOT NULL` há mais de 7 dias.

### Tabela: `predictions`
```ts
{
  id: integer (PK, autoincrement)
  user_id: integer (FK users)
  match_id: integer (FK matches)
  home_score: integer (NOT NULL)
  away_score: integer (NOT NULL)
  qualified_team_code: text                  // 'home' ou 'away' (mata-mata se empate)
  points_awarded: integer (default 0)
  base_points: integer (default 0)
  classification_bonus: integer (default 0)
  multiplier: real (default 1.0)
  computed_at: timestamp
  created_at: timestamp (NOT NULL)
  updated_at: timestamp
  UNIQUE(user_id, match_id)
}
```

### Tabela: `prediction_history` (auditoria)
```ts
{
  id: integer (PK, autoincrement)
  user_id: integer (FK)
  match_id: integer (FK)
  home_score: integer
  away_score: integer
  qualified_team_code: text
  changed_at: timestamp
  source: text                               // 'user', 'admin', 'system'
}
```

### Tabela: `tournament_predictions`
```ts
{
  id: integer (PK, autoincrement)
  user_id: integer (FK)
  champion_code: text
  runner_up_code: text
  semifinalist_1_code: text  // outros semis além de campeão e vice (sem ordem)
  semifinalist_2_code: text
  top_scorer_name: text
  best_player_name: text
  best_young_player_name: text
  points_awarded: integer (default 0)
  computed_at: timestamp
  closed_at: timestamp
  UNIQUE(user_id)
}
```

### Tabela: `tournament_results` (preenchido pelo admin)
```ts
{
  id: integer (PK, default 1)
  champion_code: text
  runner_up_code: text
  semifinalists: text                        // JSON array de 4 códigos
  top_scorer_name: text
  best_player_name: text
  best_young_player_name: text
  finalized_at: timestamp
}
```

### Tabela: `phase_windows`
```ts
{
  id: integer (PK)
  stage: text (UNIQUE)                       // 'group', 'r32', 'r16', 'qf', 'sf', 'final'
  opens_at: timestamp (NOT NULL)
  closes_at: timestamp (NOT NULL)
  multiplier: real (NOT NULL)
}
```

### Tabela: `bot_messages` (rastreio de notificações)
```ts
{
  id: integer (PK)
  type: text                                 // 'morning_digest', 'match_reminder', 'recap', etc.
  sent_to: text                              // 'group' ou telegram_id
  match_id: integer (FK, nullable)
  payload: text                              // JSON com conteúdo
  sent_at: timestamp
  telegram_message_id: integer
}
```

### Tabela: `polling_logs` **[NOVA]**
```ts
{
  id: integer (PK, autoincrement)
  ran_at: timestamp (NOT NULL)
  endpoint: text (NOT NULL)                  // 'poll-live-matches', 'poll-fixtures'
  checked: integer                           // jogos verificados
  updated: integer                           // jogos com mudança
  locked: integer                            // resultados travados como oficiais
  conflicts: integer                         // fontes em desacordo
  duration_ms: integer
  error: text                                // null se sucesso
}
```

## 6. Endpoints e API routes

### Webhooks (entrada)
- `POST /api/telegram/webhook` — Updates do Telegram

### Cron (agendado)
- `GET /api/cron/poll-live-matches` — A cada 1 min via cron-job.org durante a Copa
- `GET /api/cron/poll-fixtures` — 1×/hora via cron-job.org (detecta mudanças de horário)
- `GET /api/cron/morning-digest` — 9h diário via Vercel Cron
- `GET /api/cron/pre-match-reminder` — A cada 15 min via cron-job.org (era 5min, ajustado pra reduzir custos de execução)
- `GET /api/cron/weekly-recap` — Domingo 22h via Vercel Cron
- `GET /api/cron/daily-backup` — Diário via GitHub Actions

Todos os endpoints de cron exigem header `Authorization: Bearer ${CRON_SECRET}`.

### Mini App API (consumido pelo frontend)
- `POST /api/auth/telegram` — Valida initData, cria sessão
- `GET /api/me` — Dados do usuário logado
- `GET /api/matches` — Lista de jogos (filtros: stage, status, date_range)
- `GET /api/matches/:id` — Detalhes + meu palpite
- `POST /api/predictions` — Cria/atualiza palpite (auto-save)
- `GET /api/predictions/my` — Meus palpites
- `GET /api/predictions/match/:id` — Palpites de todos (só se já começou)
- `GET /api/tournament-predictions/my` — Meus palpites de torneio
- `POST /api/tournament-predictions` — Salva palpites de torneio
- `GET /api/ranking` — Ranking atual
- `GET /api/ranking/:user_id` — Detalhes de pontuação de um usuário

### Admin
- `POST /api/admin/match/:id/result` — Força resultado manual
- `POST /api/admin/recalculate` — Recalcula pontuações
- `POST /api/admin/tournament-results` — Insere resultados de torneio
- `POST /api/admin/user/:id/payment` — Marca pagamento
- `GET /api/admin/dashboard` — Estatísticas internas
- `GET /api/admin/polling-status` — Status do polling + conflitos não resolvidos

## 7. Bot do Telegram — comportamento

### Comandos disponíveis (escondidos do menu, mas funcionais)
- `/start` — Boas-vindas + botão "Abrir Bolão"
- `/palpitar` — Abre Mini App em palpites
- `/ranking` — Top 10
- `/meuspontos` — Detalhamento dos pontos
- `/proximo` — Próximo jogo + status do palpite
- `/jogosdodia` — Jogos do dia
- `/regulamento` — Link para regulamento
- `/ajuda` — Lista de comandos

### Menu persistente
Botão único: "🏆 Abrir Bolão" → abre Mini App.

### Notificações automáticas no grupo

| Quando | O quê |
|---|---|
| 9h (diário) | Lista de jogos do dia + menção a quem não palpitou |
| 30 min antes de jogo top | "Brasil x Marrocos em 30 min. Última chance de palpitar." |
| 30 min antes de qualquer jogo (DM) | DM privada pra quem não palpitou |
| Após jogo top terminar | Placar + top 3 ranking atualizado |
| 23h (diário) | Resumão consolidado dos jogos do dia |
| Domingo 22h | Recap semanal (gerado por Claude Haiku) |
| Abertura de fase do mata-mata | "Palpites dos 16-avos abertos. Prazo: [data]" |

**Top jogos** = jogos com Brasil + jogos de fase eliminatória + jogo único do dia.

### Tom de voz do bot
Zoeira certeira, não cringe. Aplica princípios de humanizer:
- Frases curtas
- Sem inflar importância
- Provocação que vem do dado
- Sem corporativismo, sem "vamos juntos", sem "jornada"
- Máximo 1-2 emojis por mensagem

### Menção pública a quem não palpitou
Formato: "@fulano @beltrano não palpitaram os jogos de hoje. Andem."
Frequência: 1× na mensagem matinal das 9h.

## 8. Mini App — telas

### Estrutura: 4 abas no rodapé
1. **Início** (home)
2. **Palpitar**
3. **Ranking**
4. **Mais**

### Tela Início
- Header com logo "BOLÃO DO REVOADA"
- Card grande do usuário: foto + nome + posição + pontos
- Card de ação dinâmico:
  - Palpites pendentes → "⚠️ N jogos sem palpite" + botão
  - Tudo palpitado, jogo próximo → "Próximo: Brasil x Marrocos em 3h 12min"
  - Jogo ao vivo → placar em tempo real + AO VIVO pulsante
  - Senão → "Acompanhe o ranking"
- Lista compacta dos próximos 3 jogos

### Tela Palpitar
- Topo: "Fase de grupos — 18 de 72 palpites feitos" (barra de progresso)
- Fase de grupos: acordeão por grupo (A-L), 6 jogos cada
- Mata-mata: lista plana cronológica
- Cada card: bandeiras + nomes + horário (UTC−3) + seletores +/− (0 a 9)
- Mata-mata com empate: seletor adicional "Quem se classifica?"
- Auto-save a cada toque (debounce 500ms)
- "✓ salvo" pisca no canto

### Tela Ranking
- Lista dos 10 com posição, foto, nome, pontos (Inter Tight Black), variação (↑↓)
- Seu card destacado em azul FIFA
- Toque em jogador → drawer com pontos por fase, acertos, % aproveitamento
- Filtros: Geral / Esta semana / Mata-mata

### Tela Mais
- Meus palpites de torneio (editável até 11/06)
- Jogos de hoje
- Regulamento
- Histórico de palpites (read-only)
- Conta (sem edição)
- Painel admin (se is_admin)
- Sair (limpa cache local)

### Painel admin
- Forçar resultado manual em qualquer jogo (com confirmação dupla)
- Recalcular pontuação geral
- Inserir resultados de torneio (campeão, artilheiro etc.)
- Marcar pagamento de inscrição
- Logs do sistema (últimas 100 ações do polling)
- Resetar palpite específico (caso de erro técnico)

## 9. Fluxos críticos

### Fluxo 1 — Onboarding
1. Usuário entra no grupo
2. Bot detecta `chat_member`, posta no grupo com botão "Iniciar Bolão"
3. Botão dispara `/start` em DM
4. Bot responde com botão "Abrir Bolão" (Mini App)
5. Ao abrir Mini App pela 1ª vez:
   - Valida initData
   - Cria registro em `users`
   - Onboarding em 2 passos: palpites de torneio + explicação da fase de grupos
6. Pagamento R$ 100 via Pix, admin registra manualmente

### Fluxo 2 — Fazer palpite
1. Abre Mini App em Palpitar
2. Expande grupo / seleciona jogo
3. Ajusta seletores +/−
4. Debounce 500ms → POST `/api/predictions`
5. Servidor valida (auth, ativo, jogo existe, `now() < predictions_close_at`, 0≤score≤9)
6. Salva em `predictions` + registra em `prediction_history`
7. Retorna `{success: true, prediction}`
8. Frontend mostra "✓ salvo" por 1.5s

### Fluxo 3 — Apuração (reconciliação multi-fonte)
1. cron-job.org dispara `/api/cron/poll-live-matches` a cada 1 min
2. Endpoint busca jogos com `kickoff_at <= now() + 30min` E `result_locked_at IS NULL` E `status IN ('scheduled','live')`
3. Para cada jogo (limite de 5 em paralelo):
   - Bate em paralelo nas fontes ativas: football-data + FIFA (e ge.globo + Wikipedia se 2 anteriores falharem)
   - Grava cada resposta em `match_snapshots`
   - Verifica concordância:
     - **≥2 fontes concordam em score E status** → atualiza `matches` com placar oficial
     - Se status virou `finished`: verifica histórico em `match_snapshots`. Se concordou em ≥10 verificações consecutivas (≈10 min com poll de 1 min) → marca `result_locked_at = now()`, dispara recálculo
   - Se discordância persiste >5 ciclos: registra `conflicts += 1` em `polling_logs`, alerta admin via DM (Fase 6)
4. Recálculo de pontuação:
   - Para cada palpite: aplica tabela hierárquica → `base_points`
   - Mata-mata: verifica `qualified_team_code` → `classification_bonus`
   - Multiplica pela fase → `points_awarded = (base_points + classification_bonus) * multiplier`
   - Atualiza `predictions`. **Operação idempotente**: recalcular o mesmo jogo nunca duplica pontos.

### Fluxo 4 — Recap semanal
1. Vercel Cron `/api/cron/weekly-recap` roda domingo 22h
2. Coleta dados da semana (jogos finalizados, mudanças no ranking, placares exatos, curiosidades)
3. Chama Claude Haiku 4.5 com prompt estruturado (tom zoeiro certeiro, humanizer)
4. Posta no grupo + botão "Ver ranking completo"

## 10. Segurança

### Autenticação Telegram Mini App
1. Parse do `initData`
2. Reconstrói data-check-string (campos exceto `hash`, ordenados, separados por `\n`)
3. Gera secret: `HMAC-SHA256("WebAppData", BOT_TOKEN)`
4. Calcula `HMAC-SHA256(data-check-string, secret_key)` em hex
5. Compara com `hash` (constant-time)
6. Verifica `auth_date` não é mais antigo que 24h
7. Se válido: retorna `telegram_id`

### Webhook do Telegram
Header `X-Telegram-Bot-Api-Secret-Token` comparado contra `TELEGRAM_WEBHOOK_SECRET`.

### Variáveis de ambiente

```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_GROUP_CHAT_ID=
ADMIN_TELEGRAM_IDS=                   # CSV de telegram_ids admin
ANTHROPIC_API_KEY=
FOOTBALL_DATA_API_KEY=
FIFA_API_BASE=https://api.fifa.com/api/v3
CRON_SECRET=                          # hex 32, autenticação de crons
NEXT_PUBLIC_APP_URL=https://bolao-revoada.vercel.app
```

### Rate limiting
- `/api/predictions`: 60 req/min/usuário
- `/api/telegram/webhook`: 100 req/min
- Demais: 30 req/min/usuário

### Anti-trapaça
- Validação server-side de `predictions_close_at` em todo save
- `prediction_history` para auditoria
- Palpites alheios filtrados no backend antes do apito
- Logs estruturados de toda mudança em `predictions`

## 11. Resiliência e fallbacks

### Estratégia de fontes em 4 camadas
1. **football-data.org** (primária): API estável, free tier 10 req/min, cobertura WC2026 confirmada
2. **FIFA API** (`api.fifa.com/api/v3/calendar/matches`): confirmação, oficial mas não documentada
3. **ge.globo.com**: terceira camada via JSON-LD embutido (latência ~5-10s, fonte em PT)
4. **Wikipedia API** (`pt.wikipedia.org/w/api.php`): rede de segurança final

Regra de oficialização: ≥2 fontes concordando por 10 verificações consecutivas (≈10 min).

### Discordância persistente
Se 2+ fontes discordam por mais de 5 ciclos: alerta admin por DM com link comparativo. Sistema não fecha apuração até admin confirmar manualmente.

### Todas as fontes caíram por >30 min
Polling continua tentando. Alerta admin. Apuração fica pendente.

### Jogo cancelado (W.O.)
Admin marca `status='cancelled'`. Cada palpite recebe média dos pontos do usuário em jogos da mesma fase.

### Telegram cai
Mini App continua funcionando (Vercel). Notificações ficam em fila com retry exponencial.

### Backup
GitHub Actions roda diariamente, exporta SQL do Turso pra repo privado. Retenção: todos os snapshots durante a Copa.

## 12. Não-objetivos

- Login Google/Facebook/email (auth só via Telegram)
- Múltiplos bolões
- App nativo iOS/Android (Mini App resolve)
- Pagamento integrado (Pix manual)
- Mensagens entre usuários (zoeira no grupo)
- "Comparar palpites" (v2 pós-Copa)
- Push web (Telegram resolve)
- Análises pré-jogo por IA (só recap semanal)
- Internacionalização (só PT)
- Endpoint `/api/cron/keep-alive` (cold start de 200-500ms é irrelevante)

## 13. Glossário
- **Mata-mata:** fases eliminatórias (r32, r16, qf, sf, 3rd, final)
- **Bônus de classificação:** +5 pts no mata-mata por acertar quem se classificou
- **Multiplicador de fase:** fator que multiplica pontos do jogo
- **Palpite de torneio:** previsão pré-Copa (campeão, vice, semis, artilheiro, prêmios individuais)
- **Apuração:** processo de calcular pontuação após jogo
- **Janela de palpite:** período em que palpites podem ser criados/editados
- **Top jogo:** Brasil, fase eliminatória, ou único do dia
- **Snapshot:** uma resposta individual de uma fonte de dados em um momento específico
- **Reconciliação:** processo de comparar snapshots de múltiplas fontes para chegar no resultado oficial

## 14. Distribuição de jogos por fase (referência canônica)

**Copa 2026: 48 seleções, 12 grupos de 4, 32 classificados ao mata-mata.**

| Stage | Nome popular | Times | Jogos |
|---|---|---|---|
| `group` | Fase de grupos | 48 | 72 |
| `r32` | 16-avos / Round of 32 | 32 | 16 |
| `r16` | Oitavas / Round of 16 | 16 | 8 |
| `qf` | Quartas | 8 | 4 |
| `sf` | Semifinais | 4 | 2 |
| `3rd` | Disputa de 3º lugar | 2 | 1 |
| `final` | Final | 2 | 1 |
| **TOTAL** |  |  | **104** |

Esta tabela é a fonte de verdade para validações de seed e qualquer query agregada.
