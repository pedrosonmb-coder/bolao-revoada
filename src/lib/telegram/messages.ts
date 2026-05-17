import type { Match, Prediction, User } from '@/lib/db/schema'
import { PRODUCT_CONFIG, TOTAL_PRIZE_BRL } from '@/lib/config'
import { getFlagEmoji } from './flags'

export type RankingEntry = {
  first_name: string
  telegram_username: string | null
  total_points: number
  position: number
}

function formatKickoff(kickoffAt: Date): string {
  const brt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(kickoffAt)
  return brt
}

export function welcomeMessage(firstName: string): string {
  const total = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(TOTAL_PRIZE_BRL)
  return (
    `Bem-vindo ao Bolão do Revoada, ${firstName}.\n` +
    `${total} na mesa, 104 jogos, ${PRODUCT_CONFIG.PARTICIPANT_COUNT} amigos.\n` +
    `Toque abaixo pra começar.`
  )
}

export function rankingMessage(rankings: RankingEntry[]): string {
  if (rankings.length === 0) {
    return 'Ninguém cadastrado ainda. Cadê o pessoal?'
  }
  if (rankings.length === 1) {
    return `Só ${rankings[0].first_name} no bolão até agora. Solidão.`
  }

  const lines = rankings.map((r) => {
    const pts = r.total_points === 1 ? '1 pt' : `${r.total_points} pts`
    return `${r.position}. ${r.first_name} — ${pts}`
  })

  return `🏆 Ranking — Bolão do Revoada\n\n${lines.join('\n')}`
}

export function myPointsMessage(user: User, totalPoints: number): string {
  if (totalPoints === 0) {
    return `Você tem 0 pontos. Copa ainda nem começou, calma.`
  }
  return `Você tem ${totalPoints} pts. ${totalPoints > 50 ? 'Tá bem.' : 'Ainda dá pra recuperar.'}`
}

export function nextMatchMessage(match: Match, userPrediction?: Prediction): string {
  const homeFlag = getFlagEmoji(match.home_team_code)
  const awayFlag = getFlagEmoji(match.away_team_code)
  const kickoff = formatKickoff(new Date(match.kickoff_at))

  let location = ''
  if (match.venue || match.city) {
    const parts = [match.venue, match.city, match.country].filter(Boolean)
    location = `\n📍 ${parts.join(', ')}`
  }

  let predictionStatus = 'Você ainda não palpitou.'
  if (userPrediction) {
    predictionStatus = `Você palpitou ${userPrediction.home_score}×${userPrediction.away_score}`
  }

  return (
    `Próximo jogo: ${homeFlag} ${match.home_team_name} vs ${match.away_team_name} ${awayFlag}\n` +
    `🕐 ${kickoff} (horário de Brasília)` +
    location +
    `\n\n${predictionStatus}`
  )
}

export function dailyMatchesMessage(matches: Match[]): string {
  if (matches.length === 0) {
    return 'Hoje não tem Copa. Aproveita o dia.'
  }

  const lines = matches.map((m) => {
    const homeFlag = getFlagEmoji(m.home_team_code)
    const awayFlag = getFlagEmoji(m.away_team_code)
    const time = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(m.kickoff_at))
    return `${homeFlag} ${m.home_team_name} vs ${m.away_team_name} ${awayFlag} — ${time}`
  })

  const plural = matches.length === 1 ? 'jogo hoje' : 'jogos hoje'
  return `${matches.length} ${plural}.\n\n${lines.join('\n')}`
}

export function noGamesMessage(): string {
  return 'Acabou. Vai estudar.'
}

export function notInGroupMessage(): string {
  return 'Você precisa estar no grupo do Bolão do Revoada pra usar o bot. Pede pra alguém te adicionar.'
}

export function inactiveUserMessage(): string {
  return 'Sua participação foi encerrada. Procure o organizador.'
}

export function helpMessage(): string {
  return (
    `Comandos disponíveis:\n\n` +
    `/start — inicia o bot e abre o Mini App\n` +
    `/palpitar — abre os palpites. Não deixa pra última hora.\n` +
    `/ranking — vê quem tá na frente. Ou tentando não afundar.\n` +
    `/meuspontos — seus pontos até agora. Coragem.\n` +
    `/proximo — descobre o que vem aí. Útil se você esqueceu que tem Copa rolando.\n` +
    `/jogosdodia — jogos de hoje com horários. Sem desculpa.\n` +
    `/regulamento — lê antes de reclamar do resultado.\n` +
    `/ajuda — isso aqui.`
  )
}

export function wrongGroupMessage(): string {
  return 'Esse bot só funciona no grupo oficial do Bolão do Revoada.'
}

export function fallbackDmMessage(): string {
  return 'Manda comando ou aperta /ajuda. Aqui só comando.'
}

export function welcomeGroupMessage(firstName: string, botUsername: string): string {
  return (
    `${firstName}, bem-vindo ao Bolão do Revoada.\n` +
    `Toque no botão abaixo pra iniciar conversa privada com o bot.`
  )
}
