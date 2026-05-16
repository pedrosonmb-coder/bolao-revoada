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
    const result = ['member', 'administrator', 'creator'].includes(member.status)
    cache.set(telegramId, { result, expiresAt: now + CACHE_TTL_MS })
    return result
  } catch {
    cache.set(telegramId, { result: false, expiresAt: now + CACHE_TTL_MS })
    return false
  }
}
