import { bot } from '@/lib/telegram/bot'
import { env } from '@/lib/env'

const SEP = '='.repeat(60)

async function reativarWebhook() {
  await bot.api.setWebhook(`${env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`, {
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query', 'chat_member', 'my_chat_member'],
    drop_pending_updates: true,
  })
  console.log('✓ Webhook reativado')
}

async function main() {
  console.log(`\n${SEP}`)
  console.log('=== fix-chat-id ===')
  console.log(SEP)
  console.log(`\nTELEGRAM_GROUP_CHAT_ID atual: ${env.TELEGRAM_GROUP_CHAT_ID}`)

  await bot.api.deleteWebhook({ drop_pending_updates: false })
  console.log('✓ Webhook desativado temporariamente')

  console.log(`\n${SEP}`)
  console.log("MANDA UMA MENSAGEM QUALQUER NO GRUPO 'Bolão do Revoada - TESTE' AGORA.")
  console.log('Aguardando até 30 segundos...')
  console.log(SEP)

  let capturedId: number | null = null
  const deadline = Date.now() + 30_000
  let offset = 0

  while (Date.now() < deadline && capturedId === null) {
    const updates = await bot.api.getUpdates({ timeout: 5, limit: 100, offset })

    for (const update of updates) {
      offset = update.update_id + 1
      const chat = update.message?.chat
      if (
        chat &&
        (chat.type === 'supergroup' || chat.type === 'group') &&
        chat.title?.toLowerCase().includes('bolão')
      ) {
        capturedId = chat.id
        break
      }
    }
  }

  await reativarWebhook()

  if (capturedId === null) {
    console.log('\n❌ Não recebi mensagens. Tente rodar novamente e mande mensagem mais rápido.')
    return
  }

  const currentValue = env.TELEGRAM_GROUP_CHAT_ID
  if (Number(currentValue) === capturedId) {
    console.log('\n✓ TELEGRAM_GROUP_CHAT_ID já está correto. Bug é outro, me reporte.')
    return
  }

  console.log(`\n${SEP}`)
  console.log('❌ TELEGRAM_GROUP_CHAT_ID ESTÁ ERRADO')
  console.log(SEP)
  console.log(`\n  Valor atual:   ${currentValue}`)
  console.log(`  Valor correto: ${capturedId}`)
  console.log(`
  Para corrigir:

  1. Atualize .env.local: TELEGRAM_GROUP_CHAT_ID=${capturedId}
  2. Atualize na Vercel: Dashboard → bolao-revoada → Settings → Environment Variables → edit TELEGRAM_GROUP_CHAT_ID → Save
  3. Rode os commits para limpar logs de debug:
     git add .
     git commit -m "fix: TELEGRAM_GROUP_CHAT_ID atualizado + limpeza de logs"
     git push origin main
  4. Aguarde deploy verde na Vercel
  5. Teste /start no Telegram
`)
  console.log(SEP)
}

main().catch((err) => {
  console.error('Erro no fix-chat-id:', err)
  process.exit(1)
})
