import { db } from '@/lib/db'
import { botMessages } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { bot } from '@/lib/telegram/bot'
import { acquireLock, releaseLock } from './lock'
import type { SendOptions, SendResult } from './types'

export async function sendNotification(options: SendOptions): Promise<SendResult> {
  const { type, key, chatId, text, matchId, payload, parseMode } = options

  // Avaliado por chamada (não no load do módulo) para funcionar com tsx que faz ESM hoist dos imports
  const isDryRun = process.env.NOTIFICATIONS_DRY_RUN === 'true'

  const acquired = await acquireLock(type, key)
  if (!acquired) {
    return { sent: false, reason: 'already_sent' }
  }

  if (isDryRun) {
    console.log(`[DRY_RUN] ${type} → chatId=${chatId} key=${key}`)
    console.log(`[DRY_RUN] texto: ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`)
    // Grava em bot_messages para que asserções de idempotência funcionem nos testes
    await db
      .update(botMessages)
      .set({ payload: JSON.stringify({ dry_run: true, ...(payload ?? {}) }) })
      .where(and(eq(botMessages.type, type), eq(botMessages.sent_to, key)))
    return { sent: true }
  }

  try {
    const msg = await bot.api.sendMessage(chatId, text, {
      parse_mode: parseMode,
    })

    // Atualiza a linha de lock com dados reais do envio
    await db
      .update(botMessages)
      .set({
        telegram_message_id: msg.message_id,
        match_id: matchId ?? null,
        payload: JSON.stringify(payload ?? {}),
      })
      .where(and(eq(botMessages.type, type), eq(botMessages.sent_to, key)))

    console.log(`[notifications] sent ${type} → ${chatId} (msg_id=${msg.message_id})`)
    return { sent: true }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    console.error(`[notifications] FAILED ${type} → ${chatId}: ${reason}`)

    // Libera lock apenas se NÃO for erro de permissão (bot can't initiate DM)
    // Erro de permissão não vai resolver em retry, então mantém o lock
    const isPermissionError =
      reason.includes('Forbidden') || reason.includes('bot was blocked') || reason.includes("can't initiate")

    if (!isPermissionError) {
      await releaseLock(type, key)
    } else {
      // Marca como falha permanente no payload para diagnóstico
      await db
        .update(botMessages)
        .set({ payload: JSON.stringify({ lock: true, failed: true, reason }) })
        .where(and(eq(botMessages.type, type), eq(botMessages.sent_to, key)))
    }

    return { sent: false, reason }
  }
}
