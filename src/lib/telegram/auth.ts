import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '../env'

export type TelegramUser = {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
}

/**
 * Valida o initData recebido do Telegram Mini App.
 *
 * Algoritmo oficial do Telegram:
 * 1. Extrai todos os campos exceto `hash`, ordena alfabeticamente, junta com \n
 * 2. secret_key = HMAC-SHA256(key="WebAppData", data=BOT_TOKEN)
 * 3. hash_esperado = HMAC-SHA256(key=secret_key, data=data_check_string) em hex
 * 4. Compara com o hash recebido usando constant-time comparison
 * 5. Verifica que auth_date não é mais antigo que 24h
 */
export function validateInitData(initData: string): TelegramUser | null {
  if (!initData) return null

  let params: URLSearchParams
  try {
    params = new URLSearchParams(initData)
  } catch {
    return null
  }

  const receivedHash = params.get('hash')
  if (!receivedHash) return null

  // Reconstrói data-check-string: todos os campos exceto hash, ordenados, separados por \n
  const entries = Array.from(params.entries())
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)

  const dataCheckString = entries.join('\n')

  // secret_key = HMAC-SHA256("WebAppData", BOT_TOKEN)
  const secretKey = createHmac('sha256', 'WebAppData').update(env.TELEGRAM_BOT_TOKEN).digest()

  // hash computado
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  // Constant-time comparison para evitar timing attacks
  try {
    const a = Buffer.from(computedHash, 'hex')
    const b = Buffer.from(receivedHash, 'hex')
    if (a.length !== b.length) return null
    if (!timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  // Valida auth_date: não pode ser mais antigo que 24h
  const authDate = parseInt(params.get('auth_date') ?? '0', 10)
  if (!authDate) return null
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (nowSeconds - authDate > 24 * 60 * 60) return null

  // Extrai e faz parse do campo user
  const userJson = params.get('user')
  if (!userJson) return null

  try {
    const user = JSON.parse(userJson) as TelegramUser
    if (!user.id || !user.first_name) return null
    return user
  } catch {
    return null
  }
}
