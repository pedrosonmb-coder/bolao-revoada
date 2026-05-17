import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/server/rate-limit'

function getUserKey(req: NextRequest): string {
  // Tenta extrair telegram_id do header de auth
  const auth = req.headers.get('Authorization') ?? ''
  if (auth.startsWith('dev ')) return `dev:${auth.slice(4).trim()}`
  if (auth.startsWith('tma ')) {
    // Extrai user.id do initData sem validar (só pra rate-limit key)
    try {
      const params = new URLSearchParams(auth.slice(4))
      const userJson = params.get('user')
      if (userJson) {
        const user = JSON.parse(userJson) as { id?: number }
        if (user.id) return `tma:${user.id}`
      }
    } catch {
      // fallback para IP
    }
  }
  return req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  if (!pathname.startsWith('/api/')) return NextResponse.next()

  const key = getUserKey(req)
  const isPredictionPost = pathname === '/api/predictions' && req.method === 'POST'

  const allowed = checkRateLimit(
    `${key}:${pathname}`,
    isPredictionPost ? 60 : 30,
    60_000
  )

  if (!allowed) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
      {
        status: 429,
        headers: { 'Retry-After': '60' },
      }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
