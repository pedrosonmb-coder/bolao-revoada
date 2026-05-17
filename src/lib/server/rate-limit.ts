// Rate limiting em memória com sliding window
// Suficiente para Vercel Hobby com uma instância; substitua por Redis em escala

type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

function cleanup() {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}

export function checkRateLimit(key: string, maxRequests: number, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    if (store.size % 100 === 0) cleanup()
    return true
  }

  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}
