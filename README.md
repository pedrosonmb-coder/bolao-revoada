# Bolão do Revoada

Bolão privado da Copa do Mundo FIFA 2026 para 9 amigos. Mini App do Telegram com sistema de pontuação, ranking em tempo real e bot de notificações.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui (fases futuras) |
| Banco | Turso (libSQL serverless) |
| ORM | Drizzle ORM |
| Bot | grammY |
| Auth | Telegram Mini App initData (HMAC-SHA256) |
| LLM | Claude Haiku via @anthropic-ai/sdk |
| Deploy | Vercel (Hobby) |

## Como rodar

```bash
# 1. Instalar dependências
pnpm install

# 2. Copiar e preencher variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com seus valores

# 3. Gerar migrations do banco
pnpm db:generate

# 4. Aplicar migrations no Turso
pnpm db:migrate

# 5. Iniciar em desenvolvimento
pnpm dev
```

Acesse `http://localhost:3000/api/health` para verificar a conexão com o banco.

## Variáveis de ambiente

Veja `.env.example` para a lista completa. As principais:

| Variável | Descrição |
|---|---|
| `TURSO_DATABASE_URL` | URL do banco Turso (ex: `libsql://...`) |
| `TURSO_AUTH_TOKEN` | Token de autenticação do Turso |
| `TELEGRAM_BOT_TOKEN` | Token do bot (BotFather) |
| `TELEGRAM_WEBHOOK_SECRET` | Segredo para validar webhooks |
| `TELEGRAM_GROUP_CHAT_ID` | ID do grupo do Telegram |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic (Claude) |
| `FOOTBALL_DATA_API_KEY` | Chave da football-data.org |
| `ADMIN_TELEGRAM_IDS` | IDs dos admins separados por vírgula |
| `NEXT_PUBLIC_APP_URL` | URL pública do app na Vercel |

## Scripts

```bash
pnpm dev          # Dev com Turbopack
pnpm build        # Build de produção
pnpm start        # Inicia build de produção
pnpm db:generate  # Gera migrations Drizzle
pnpm db:migrate   # Aplica migrations no banco
pnpm db:studio    # Abre Drizzle Studio (UI do banco)
pnpm lint         # ESLint
```

## Especificação completa

Consulte `docs/spec.md` para a especificação técnica completa: regras de negócio, schema, endpoints, fluxos, segurança e mais.
