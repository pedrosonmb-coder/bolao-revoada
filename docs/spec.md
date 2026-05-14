# Bolão do Revoada — Especificação Técnica

> Este documento é a fonte única de verdade para a construção do sistema. Toda decisão de produto, regras de negócio, contratos de dados e arquitetura técnica estão aqui. Consulte este documento antes de implementar qualquer fase.

---

## 1. Produto

**Nome:** Bolão do Revoada
**Tipo:** Bolão privado da Copa do Mundo FIFA 2026 para 9 amigos
**Bolo:** R$ 900 (R$ 100 por participante)
**Período de operação:** 11/06/2026 a 19/07/2026 (final + janela de prêmios FIFA)

## 2. Stack técnico

| Camada | Tecnologia | Por quê |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Full-stack em uma linguagem, deploy zero-fricção na Vercel |
| UI | Tailwind CSS 4 + shadcn/ui (componentes selecionados) | Mobile-first, dark mode nativo, copy-paste |
| Banco | Turso (libSQL/SQLite serverless) | Free tier generoso, SQL puro, latência baixa |
| ORM | Drizzle ORM | Leve, type-safe, schema-first |
| Hospedagem | Vercel (Hobby tier) | Free tier suficiente, cron embutido, edge network |
| Cron/polling | Vercel Cron (geral) + GitHub Actions (jogos ao vivo, 30s) | Free tier de ambos cobre a operação |
| Bot Telegram | grammY (biblioteca Node.js) | Mais moderno e ergonômico que telegraf |
| Auth | Telegram Mini App initData (HMAC signature validation) | Sem login, identidade vem do Telegram |
| LLM | Claude Haiku 4.5 via @anthropic-ai/sdk | Recap semanal, único uso de IA em runtime |
| Fontes de dados | FIFA API (primária) + football-data.org (confirmação) + Wikipedia (fallback) | Triple-check para evitar erro de apuração |

## 3. Identidade visual

### Palette

**Light mode:**
- `bg-base`: `#FFFFFF` (fundo)
- `bg-surface`: `#F5F5F5` (cards)
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
- UI/corpo: **Inter** (Google Fonts, gratuita)
- Números grandes (placares, pontos, posições): **Inter Tight** peso 800 (Black)
- Pesos disponíveis: 400 (regular), 500 (medium), 700 (bold), 800 (black para números)

### Sistema de cor por estado (sem semântica colorida)
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
"BOLÃO DO REVOADA" em Inter Tight Black, all caps. Branco no dark mode, preto no light mode. Sem ícone.

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
| 16-avos / Rodada de 32 | x1,5 |
| Oitavas | x2 |
| Quartas | x2,5 |
| Semifinais | x3 |
| Disputa de 3º lugar | x2 |
| Final | x4 |

Aplicado sobre o total do jogo (placar + bônus de classificação).

### 4.4 Palpites de torneio

| Palpite | Pontos |
|---|---|
| Campeão | 100 |
| Vice-campeão | 50 |
| Cada semifinalista (até 4) | 25 |
| Artilheiro da Copa | 50 |
| Melhor jogador da Copa (Bola de Ouro Adidas) | 50 |
| Melhor jovem da Copa (Young Player Award FIFA) | 25 |

Máximo possível: 375 pontos.

### 4.5 Janelas de palpite

| Bloco | Fecha em |
|---|---|
| Torneio + 72 jogos de grupos | 5 min antes do apito de abertura (11/06/2026) |
| 16-avos | 5 min antes do 1º jogo dos 16-avos |
| Oitavas | 5 min antes do 1º jogo das oitavas |
| Quartas | 5 min antes do 1º jogo das quartas |
| Semifinais | 5 min antes do 1º jogo das semis |
| 3º lugar + Final | 5 min antes do jogo de 3º lugar |

Após fechamento, palpite é imutável (validação server-side com timestamp).
Não palpitou = 0 pontos naquele jogo.

### 4.6 Regras operacionais

- Prorrogação conta para placar; pênaltis não contam para placar (contam para bônus de classificação)
- Palpites alheios ocultos até o apito do jogo
- Resultados oficiais: FIFA + football-data.org concordantes por 10 min consecutivos
- Todo horário em UTC−3 (Brasília)

### 4.7 Critérios de desempate (em ordem)

1. Mais vencedores acertados
2. Mais placares exatos
3. Mais pontos em palpites de torneio
4. Quem palpitou primeiro (fase de grupos, ordem cronológica)
5. Cara ou coroa via `crypto.randomInt`

### 4.8 Premiação

- 1º lugar: R$ 630 (70%)
- 2º lugar: R$ 180 (20%)
- 3º lugar: R$ 90 (10%)

Pagamento até 7 dias úteis após apuração final (que aguarda saída dos prêmios individuais da FIFA, ~48h após a final).

## 5. Modelo de dados (schema Drizzle)

### Tabela: `users`

```ts
{
  id: integer (PK, autoincrement)
  telegram_id: integer (UNIQUE, NOT NULL) // ID numérico do Telegram
  telegram_username: text                  // @username (opcional, pode mudar)
  first_name: text (NOT NULL)
  last_name: text
  photo_url: text                          // URL da foto do Telegram
  is_admin: boolean (default false)
  is_active: boolean (default true)        // false se desistiu
  paid_at: timestamp                       // null = ainda não pagou
  created_at: timestamp (default now)
  updated_at: timestamp
}
```

### Tabela: `matches`

```ts
{
  id: integer (PK, autoincrement)
  fifa_id: text (UNIQUE)                   // ID na API da FIFA
  fd_id: integer (UNIQUE)                  // ID na football-data.org
  stage: text (NOT NULL)                   // 'group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'
  group_name: text                         // 'A', 'B', ... 'L' (só para fase de grupos)
  match_number: integer                    // 1 a 104
  home_team_code: text (NOT NULL)          // 'BRA', 'ARG', 'TBD'
  home_team_name: text (NOT NULL)
  away_team_code: text (NOT NULL)
  away_team_name: text (NOT NULL)
  kickoff_at: timestamp (NOT NULL)         // UTC
  venue: text
  city: text
  country: text                            // 'USA', 'MEX', 'CAN'
  status: text (default 'scheduled')       // 'scheduled', 'live', 'finished', 'postponed', 'cancelled'
  home_score: integer                      // null antes do jogo
  away_score: integer
  home_score_pen: integer                  // pênaltis (só para apuração de classificação)
  away_score_pen: integer
  winner_code: text                        // 'home', 'away', 'draw' (após 90+30); 'home'/'away' se pênaltis decidirem
  qualified_team_code: text                // quem passou (só para mata-mata)
  result_locked_at: timestamp              // quando virou oficial (FIFA + FD concordaram 10 min)
  predictions_close_at: timestamp (NOT NULL) // kickoff_at - 5 minutos
  fifa_payload: text                       // JSON da última resposta da FIFA (para debug)
  fd_payload: text                          // JSON da última resposta da football-data
}
```

### Tabela: `predictions`

```ts
{
  id: integer (PK, autoincrement)
  user_id: integer (FK users)
  match_id: integer (FK matches)
  home_score: integer (NOT NULL)
  away_score: integer (NOT NULL)
  qualified_team_code: text                // 'home' ou 'away' — só relevante no mata-mata se empate no placar
  points_awarded: integer (default 0)      // pontos finais com multiplicador aplicado
  base_points: integer (default 0)         // antes do multiplicador
  classification_bonus: integer (default 0) // 5 ou 0
  multiplier: real (default 1.0)
  computed_at: timestamp                   // quando foi calculado
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
  source: text                             // 'user', 'admin', 'system'
}
```

### Tabela: `tournament_predictions`

```ts
{
  id: integer (PK, autoincrement)
  user_id: integer (FK)
  champion_code: text                      // 'BRA'
  runner_up_code: text                     // 'ARG'
  semifinalist_1_code: text
  semifinalist_2_code: text
  semifinalist_3_code: text
  semifinalist_4_code: text
  top_scorer_name: text                    // nome livre, ex 'Vinícius Júnior'
  best_player_name: text
  best_young_player_name: text
  points_awarded: integer (default 0)
  computed_at: timestamp
  closed_at: timestamp                     // quando o palpite foi travado
  UNIQUE(user_id)
}
```

### Tabela: `tournament_results` (preenchido pelo admin após a final)

```ts
{
  id: integer (PK, default 1, sempre 1 linha)
  champion_code: text
  runner_up_code: text
  semifinalists: text                      // JSON array com 4 códigos
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
  stage: text (UNIQUE)                     // 'group', 'r32', 'r16', 'qf', 'sf', 'final'
  opens_at: timestamp (NOT NULL)
  closes_at: timestamp (NOT NULL)
  multiplier: real (NOT NULL)
}
```

### Tabela: `bot_messages` (rastreio de notificações)

```ts
{
  id: integer (PK)
  type: text                               // 'morning_digest', 'match_reminder', 'recap', 'pre_match', 'post_match'
  sent_to: text                            // 'group' ou telegram_id
  match_id: integer (FK, nullable)
  payload: text                            // JSON com conteúdo
  sent_at: timestamp
  telegram_message_id: integer             // para edits posteriores
}
```

## 6. Endpoints e API routes

### Webhooks (entrada)

- `POST /api/telegram/webhook` — Recebe updates do Telegram (mensagens, callback queries, comandos)

### Cron (agendado)

- `GET /api/cron/poll-live-matches` — Roda durante jogos ao vivo (chamado pelo GitHub Actions a cada 30s)
- `GET /api/cron/poll-fixtures` — Roda 1×/hora para detectar mudanças de horário/cancelamento
- `GET /api/cron/morning-digest` — Roda 9h diariamente, manda lista de jogos no grupo
- `GET /api/cron/pre-match-reminder` — Roda a cada 5 min, manda DM para quem não palpitou em jogos próximos
- `GET /api/cron/weekly-recap` — Roda domingo 22h, gera recap com Claude API
- `GET /api/cron/keep-alive` — Roda a cada 10 min só para manter funções quentes

### Mini App API (consumido pelo frontend)

- `POST /api/auth/telegram` — Valida initData do Telegram, cria sessão
- `GET /api/me` — Retorna dados do usuário logado
- `GET /api/matches` — Lista de jogos (com filtros: stage, status, date_range)
- `GET /api/matches/:id` — Detalhes de um jogo + meu palpite
- `POST /api/predictions` — Cria/atualiza palpite (auto-save)
- `GET /api/predictions/my` — Meus palpites
- `GET /api/predictions/match/:id` — Palpites de todos para um jogo (só se já começou)
- `GET /api/tournament-predictions/my` — Meus palpites de torneio
- `POST /api/tournament-predictions` — Salva palpites de torneio
- `GET /api/ranking` — Ranking atual
- `GET /api/ranking/:user_id` — Detalhes de pontuação de um usuário

### Admin (só para is_admin = true)

- `POST /api/admin/match/:id/result` — Força resultado manualmente
- `POST /api/admin/recalculate` — Recalcula todas as pontuações
- `POST /api/admin/tournament-results` — Insere resultados de torneio (Bola de Ouro etc.)
- `POST /api/admin/user/:id/payment` — Marca pagamento de inscrição
- `GET /api/admin/dashboard` — Estatísticas internas

## 7. Bot do Telegram — comportamento

### Comandos disponíveis (escondidos do menu principal mas funcionais)

- `/start` — Boas-vindas + botão "Abrir Bolão"
- `/palpitar` — Abre Mini App na tela de palpites
- `/ranking` — Mostra top 9 (mensagem de texto)
- `/meuspontos` — Detalhamento dos pontos do usuário
- `/proximo` — Próximo jogo + status do palpite
- `/jogosdodia` — Lista de jogos do dia
- `/regulamento` — Link para regulamento
- `/ajuda` — Lista de comandos

### Menu persistente do bot

Botão único: "🏆 Abrir Bolão" → abre Mini App.

### Notificações automáticas no grupo

| Quando | O quê |
|---|---|
| 9h (diário) | Lista de jogos do dia + menção a quem não palpitou ainda |
| 30 min antes de jogo top (Brasil ou jogo da fase) | "Brasil x Marrocos em 30 min. Última chance de palpitar." |
| 30 min antes de qualquer jogo (apenas via DM) | DM privada para quem não palpitou |
| Após jogo terminar (top jogos) | Placar + top 3 ranking atualizado |
| 23h (diário) | Resumão consolidado dos jogos do dia |
| Domingo 22h | Recap semanal (gerado por Claude) |
| Abertura de fase do mata-mata | "Palpites dos 16-avos abertos. Prazo: [data]" |

**"Top jogos" = jogos com Brasil + jogos de fase eliminatória + jogo único do dia (quando não tem Brasil).**

### Tom de voz do bot

Zoeira certeira, não cringe. Aplica princípios da skill `humanizer`:
- Frases curtas
- Sem inflar importância
- Provocação que vem do dado (ex: "Beltrano segue na lanterna com 12 pontos depois de 3 empates seguidos. Coragem.")
- Sem corporativismo, sem "vamos juntos", sem emojis em excesso (no máximo 1-2 por mensagem)
- Sem "explorar", "navegar", "jornada"

### Menção pública a quem não palpitou

Formato: "@fulano @beltrano não palpitaram os jogos de hoje. Andem."
Frequência: 1x na mensagem matinal das 9h.

## 8. Mini App — telas

### Estrutura de navegação

App de uma página com abas no rodapé. 4 abas:
1. **Início** (home, padrão)
2. **Palpitar**
3. **Ranking**
4. **Mais**

### Tela Início

- Header com logo "BOLÃO DO REVOADA"
- Card grande do usuário: foto (Telegram) + nome + sua posição + pontos totais
- Card de ação principal (dinâmico):
  - Se há palpites pendentes na fase atual aberta: "⚠️ Você tem N jogos sem palpite" + botão "Palpitar agora" → aba Palpitar
  - Se tudo palpitado e há jogo próximo: "Próximo: Brasil x Marrocos em 3h 12min" + botão "Ver detalhes"
  - Se jogo ao vivo: card com placar em tempo real + indicador AO VIVO pulsante
  - Se nada do acima: "Acompanhe o ranking" + botão → aba Ranking
- Lista compacta dos próximos 3 jogos (com horário e status do meu palpite cada)

### Tela Palpitar

- Topo: indicador "Fase de grupos — 18 de 72 palpites feitos" (barra de progresso)
- Para fase de grupos: acordeão por grupo (A, B, C... L). Cada grupo expande/colapsa, mostra 6 jogos.
- Para mata-mata: lista plana cronológica.
- Cada card de jogo:
  - Bandeiras + nomes
  - Horário (UTC−3)
  - Seletores de gols casa/visitante (0 a 9, com botões +/−)
  - Se mata-mata e palpite empate: seletor adicional "Quem se classifica?"
  - Estado visual conforme seção 3
- Auto-save a cada toque (debounce 500ms)
- Indicador "✓ salvo" pisca no canto após cada save
- Jogo fechado: card opaco com cadeado, mostra meu palpite + resultado real lado a lado

### Tela Ranking

- Lista dos 9 com:
  - Posição
  - Foto + nome
  - Pontos totais (Inter Tight Black)
  - Variação (↑ ou ↓ + número desde última atualização)
- Seu card destacado em azul FIFA
- Toque em jogador → drawer com detalhamento:
  - Pontos por fase
  - Acertos: placares exatos, vencedores, classificações
  - % aproveitamento geral
- Filtros: "Geral", "Esta semana", "Mata-mata"
- (v2: "Comparar com [você]" — não no MVP)

### Tela Mais

Lista de itens:
- Meus palpites de torneio (editável até 11/06)
- Jogos de hoje
- Regulamento
- Histórico de palpites (read-only, jogos finalizados)
- Conta (foto, nome, telegram_id — sem edição)
- Se is_admin: Painel administrativo
- Sair (apenas limpa cache local, sessão sempre vem do Telegram)

### Painel admin (só visível para is_admin)

- Forçar resultado manualmente em qualquer jogo
- Recalcular pontuação geral
- Inserir resultados de torneio (campeão, artilheiro, etc.)
- Marcar/desmarcar pagamento de inscrição de cada usuário
- Logs do sistema (últimas 100 ações do polling)
- Resetar palpite específico (caso de erro técnico comprovado)

## 9. Fluxos críticos

### Fluxo 1 — Onboarding do usuário

1. Usuário entra no grupo do Telegram
2. Bot detecta `chat_member` update, manda mensagem no grupo: "@fulano, bem-vindo. Clique aqui para iniciar." com botão "Iniciar Bolão"
3. Botão dispara `/start` em DM com o bot
4. Bot responde com mensagem privada + botão "Abrir Bolão" que abre o Mini App
5. Ao abrir o Mini App pela primeira vez:
   - Valida initData
   - Cria registro em `users` se não existir (puxa first_name, last_name, photo_url do Telegram)
   - Se primeiro acesso: mostra onboarding em 2 passos
     - Passo 1: palpites de torneio (campeão, vice, etc.)
     - Passo 2: explicação da fase de grupos
6. Pagamento (R$ 100 via Pix) é registrado manualmente pelo admin no painel

### Fluxo 2 — Fazer um palpite

1. Usuário abre Mini App na aba Palpitar
2. Expande grupo (na fase de grupos) ou seleciona jogo
3. Ajusta seletores +/−
4. A cada mudança: debounce 500ms → POST `/api/predictions` com `{match_id, home_score, away_score}`
5. Servidor valida:
   - Usuário autenticado e ativo
   - Jogo existe
   - `now() < match.predictions_close_at` (se já fechou, retorna 403)
   - Score entre 0 e 9
6. Servidor salva em `predictions` (insert ou update) e registra em `prediction_history`
7. Servidor retorna `{success: true, prediction: {...}}`
8. Frontend mostra "✓ salvo" por 1.5s

### Fluxo 3 — Apuração de um jogo

1. GitHub Actions cron dispara `/api/cron/poll-live-matches` a cada 30s
2. Endpoint busca jogos com `kickoff_at <= now()` e `status IN ('scheduled', 'live')`
3. Para cada jogo:
   - Bate na FIFA API → obtém placar e status
   - Bate na football-data.org → obtém placar e status
   - Se ambas concordam:
     - Atualiza tabela `matches` (status, scores, payloads)
     - Se status virou 'finished' e ainda não foi locked:
       - Espera 10 min de estabilidade (verifica em chamadas subsequentes)
       - Após 10 min concordantes: marca `result_locked_at = now()`
       - Dispara recálculo de pontuação
   - Se discordam por mais de 5 ciclos: alerta admin via DM
4. Cálculo de pontuação por palpite:
   - Para cada palpite do jogo:
     - Aplica tabela hierárquica → `base_points`
     - Se mata-mata: verifica `qualified_team_code` → `classification_bonus`
     - Multiplica pela fase → `points_awarded = (base_points + classification_bonus) * multiplier`
     - Atualiza `predictions.points_awarded`
5. Dispara notificação no grupo se for "top jogo"

### Fluxo 4 — Geração de recap semanal

1. Cron `/api/cron/weekly-recap` roda domingo 22h
2. Coleta dados da semana:
   - Jogos finalizados
   - Mudanças no ranking
   - Quem subiu mais, quem caiu mais
   - Placares exatos da semana e quem acertou
   - Curiosidades (palpites estranhos, streaks)
3. Chama Claude Haiku com prompt estruturado:
   - Sistema: "Você é o Copa26Bot, comentarista do Bolão do Revoada. Tom zoeiro certeiro, não cringe. Aplica princípios de humanizer: frases curtas, sem inflar importância, provocação que vem do dado. Sem emoji em excesso (máx 2). Sem 'vamos juntos', 'jornada', 'explorar'."
   - User: payload JSON com os dados
4. Recebe texto narrativo, posta no grupo + botão inline "Ver ranking completo" que abre Mini App

## 10. Segurança e validação

### Autenticação Telegram Mini App

Toda requisição do Mini App envia o `initData` (string assinada pelo Telegram). Validação no servidor:

1. Parse do `initData`
2. Reconstrói data-check-string conforme docs do Telegram
3. Gera HMAC-SHA256 com chave derivada do `BOT_TOKEN`
4. Compara com hash recebido
5. Verifica `auth_date` (não pode ser mais antigo que 24h)
6. Se válido: extrai `user` do payload, retorna telegram_id

### Webhook do Telegram

Verifica o header `X-Telegram-Bot-Api-Secret-Token` contra um segredo configurado.

### Variáveis de ambiente (todas em Vercel + .env.local)

```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_GROUP_CHAT_ID=
ANTHROPIC_API_KEY=
FOOTBALL_DATA_API_KEY=
FIFA_API_BASE=https://api.fifa.com/api/v3
ADMIN_TELEGRAM_IDS=123456789      // CSV de telegram_ids com is_admin
NEXT_PUBLIC_APP_URL=https://bolao-revoada.vercel.app
```

### Rate limiting

- `/api/predictions`: max 60 req/min por usuário (auto-save legítimo cabe nisso)
- `/api/telegram/webhook`: max 100 req/min (Telegram não passa nem perto)
- Demais endpoints: 30 req/min por usuário

### Anti-trapaça

- Validação server-side de `predictions_close_at` em **todo** save
- Histórico em `prediction_history` para auditoria
- Palpites alheios filtrados no backend antes do apito (frontend nem recebe)
- Logs estruturados de toda mudança em `predictions`

## 11. Resiliência e fallbacks

### Discordância FIFA vs football-data
Se discordarem por mais de 5 ciclos (~2,5 min): alerta admin por DM com link comparativo. Sistema não fecha apuração até admin confirmar manualmente.

### API caiu durante jogo
Polling continua tentando. Se ambas as fontes caírem por mais de 30 min: alerta admin. Apuração fica pendente, recupera quando as fontes voltarem.

### Jogo cancelado (W.O.)
Admin marca status='cancelled'. Para cada palpite naquele jogo, sistema atribui média dos pontos do usuário em jogos da mesma fase.

### Telegram cai
Mini App continua funcionando (Vercel). Notificações ficam em fila no Vercel KV (se implementado) ou retry exponencial.

### Backup
GitHub Actions roda diariamente `pnpm run db:backup`, exporta SQL completo do Turso para um repo privado de backups. Retenção: todos os snapshots durante a Copa.

## 12. Não-objetivos (explicitamente fora do escopo)

- Login com Google/Facebook/e-mail (autenticação é só via Telegram)
- Suporte a múltiplos bolões (apenas Copa 2026 nesta versão)
- App nativo iOS/Android (Mini App resolve)
- Pagamento integrado (Pix manual, registrado pelo admin)
- Sistema de mensagens entre usuários (zoeira acontece no grupo do Telegram)
- "Comparar palpites" entre usuários (fica para v2 pós-Copa)
- Notificações push web (Telegram resolve)
- Análises pré-jogo geradas por IA (apenas recap semanal)
- Internacionalização (apenas português)

## 13. Glossário

- **Mata-mata:** fases eliminatórias (16-avos, oitavas, quartas, semis, 3º lugar, final)
- **Bônus de classificação:** +5 pontos no mata-mata por acertar quem se classificou
- **Multiplicador de fase:** fator que multiplica pontos do jogo conforme fase
- **Palpite de torneio:** previsão pré-Copa de campeão, vice, semifinalistas, artilheiro, melhores jogadores
- **Apuração:** processo de calcular pontuação após jogo terminar
- **Janela de palpite:** período em que palpites podem ser criados/editados para um conjunto de jogos
- **Top jogo:** jogo com Brasil, ou de fase eliminatória, ou único jogo do dia
