import { bot } from '@/lib/telegram/bot'
import { env } from '@/lib/env'

async function main() {
  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`
  console.log('Configurando webhook:', webhookUrl)

  await bot.api.setWebhook(webhookUrl, {
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query', 'chat_member', 'my_chat_member'],
    drop_pending_updates: true,
  })
  console.log('✓ Webhook configurado')

  const info = await bot.api.getWebhookInfo()
  console.log('\nInfo do webhook:')
  console.log(JSON.stringify(info, null, 2))

  if (info.last_error_message) {
    console.warn('\n⚠️  Último erro do webhook:', info.last_error_message)
  } else {
    console.log('\n✓ Sem erros recentes.')
  }
}

main().catch((err) => {
  console.error('Erro ao configurar webhook:', err)
  process.exit(1)
})
