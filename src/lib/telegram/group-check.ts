import { bot } from './bot'
import { env } from '@/lib/env'

type CacheEntry = { result: boolean; expiresAt: number }
const cache = new Map<number, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

export async function isUserInGroup(telegramId: number): Promise<boolean> {
  const now = Date.now()
  const cached = cache.get(telegramId)
  if (cached && cached.expiresAt > now) return cached.result

  try {
    const member = await bot.api.getChatMember(env.TELEGRAM_GROUP_CHAT_ID, telegramId)
    console.log(`[group-check] getChatMember(${telegramId}) → status: ${member.status}`)
    const result = ['member', 'administrator', 'creator', 'restricted'].includes(member.status)
    cache.set(telegramId, { result, expiresAt: now + CACHE_TTL_MS })
    return result
  } catch (err: unknown) {
    const e = err as { message?: string; error_code?: number }
    console.error(
      `[group-check] getChatMember(${telegramId}) falhou — code: ${e?.error_code}, message: ${e?.message}`
    )
    // Não cacheia erro: pode ser falha transitória
    return false
  }
}
