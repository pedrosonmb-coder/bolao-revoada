import { NextRequest, NextResponse } from 'next/server'
import { env } from './env'

export function verifyCronAuth(req: NextRequest): NextResponse | null {
  // Aceita Authorization: Bearer <CRON_SECRET> ou header x-vercel-cron (crons nativos do Vercel)
  const authHeader = req.headers.get('authorization')
  const vercelCron = req.headers.get('x-vercel-cron')

  if (vercelCron === '1') return null // Vercel assina os próprios crons

  if (!authHeader || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
