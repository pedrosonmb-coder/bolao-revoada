import { db } from '@/lib/db'
import { botMessages } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

/**
 * Tenta adquirir lock de uma notificação via bot_messages.
 * O índice único (type, sent_to) garante atomicidade em caso de concorrência.
 * Retorna true se o lock foi adquirido (pode enviar), false se já foi enviado.
 */
export async function acquireLock(type: string, key: string): Promise<boolean> {
  const existing = await db
    .select({ id: botMessages.id })
    .from(botMessages)
    .where(and(eq(botMessages.type, type), eq(botMessages.sent_to, key)))
    .limit(1)
    .get()

  if (existing) return false

  try {
    await db.insert(botMessages).values({
      type,
      sent_to: key,
      payload: JSON.stringify({ lock: true }),
    })
    return true
  } catch {
    // Conflito no índice único — outra instância ganhou a corrida
    return false
  }
}

/**
 * Libera o lock em caso de falha no envio, permitindo retry.
 */
export async function releaseLock(type: string, key: string): Promise<void> {
  await db
    .delete(botMessages)
    .where(and(eq(botMessages.type, type), eq(botMessages.sent_to, key)))
}
