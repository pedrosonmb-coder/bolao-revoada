import { z } from 'zod'

const envSchema = z.object({
  TURSO_DATABASE_URL: z.string().min(1, 'TURSO_DATABASE_URL é obrigatória'),
  TURSO_AUTH_TOKEN: z.string().optional().default(''),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN é obrigatória'),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1, 'TELEGRAM_WEBHOOK_SECRET é obrigatória'),
  TELEGRAM_GROUP_CHAT_ID: z.string().min(1, 'TELEGRAM_GROUP_CHAT_ID é obrigatória'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY é obrigatória'),
  FOOTBALL_DATA_API_KEY: z.string().min(1, 'FOOTBALL_DATA_API_KEY é obrigatória'),
  FIFA_API_BASE: z.string().url().default('https://api.fifa.com/api/v3'),
  ADMIN_TELEGRAM_IDS: z.string().min(1, 'ADMIN_TELEGRAM_IDS é obrigatória'),
  CRON_SECRET: z.string().min(1, 'CRON_SECRET é obrigatória'),
  NEXT_PUBLIC_APP_URL: z.string().min(1, 'NEXT_PUBLIC_APP_URL é obrigatória'),
  TELEGRAM_BOT_USERNAME: z.string().min(1, 'TELEGRAM_BOT_USERNAME é obrigatória'),
})

const _parsed = envSchema.safeParse(process.env)

if (!_parsed.success) {
  const issues = _parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n')
  throw new Error(
    `\n❌ Variáveis de ambiente inválidas ou ausentes:\n${issues}\n\nCopie .env.example para .env.local e preencha os valores.\n`
  )
}

export const env = _parsed.data
