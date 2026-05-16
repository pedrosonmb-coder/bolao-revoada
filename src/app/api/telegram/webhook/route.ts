import { NextRequest, NextResponse } from 'next/server'
import { webhookCallback } from 'grammy'
import { bot } from '@/lib/telegram/bot'
import { env } from '@/lib/env'
import {
  handleStart,
  handlePalpitar,
  handleRanking,
  handleMeusPontos,
  handleProximo,
  handleJogosDoDia,
  handleRegulamento,
  handleAjuda,
} from '@/lib/telegram/handlers/commands'
import { handleChatMember } from '@/lib/telegram/handlers/chat-member'
import { handleFallback } from '@/lib/telegram/handlers/fallback'

// Registra handlers uma vez (módulo é singleton no Vercel)
bot.command('start', handleStart)
bot.command('palpitar', handlePalpitar)
bot.command('ranking', handleRanking)
bot.command('meuspontos', handleMeusPontos)
bot.command('proximo', handleProximo)
bot.command('jogosdodia', handleJogosDoDia)
bot.command('regulamento', handleRegulamento)
bot.command('ajuda', handleAjuda)

bot.on('chat_member', handleChatMember)

// Fallback para qualquer mensagem não-comando
bot.on('message', handleFallback)

const handleUpdate = webhookCallback(bot, 'std/http')

const TIMEOUT_MS = 8_000

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verifica secret do Telegram
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (!secret || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse(null, { status: 403 })
  }

  // Sempre retorna 200 — o Telegram não deve retentar em 5xx
  try {
    const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS)
    const handlerPromise = handleUpdate(req)

    const result = await Promise.race([
      handlerPromise,
      new Promise<null>((resolve) => {
        timeoutSignal.addEventListener('abort', () => resolve(null))
      }),
    ])

    if (result === null) {
      console.warn('[webhook] slow_handler: excedeu', TIMEOUT_MS, 'ms')
      return NextResponse.json({ ok: true })
    }

    return result as NextResponse
  } catch (err) {
    console.error('[webhook] erro interno:', err)
    return NextResponse.json({ ok: true })
  }
}
