import type { Match, Prediction, User } from '@/lib/db/schema'
import { getFlagEmoji } from './flags'
import { getTeamDisplay } from '@/lib/teams'
import type { RankingEntry } from '@/lib/scoring/ranking'

// Tipo leve para o /ranking do bot (commands.ts usa esse)
export type BotRankingEntry = {
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
  return (
    `Bem-vindo ao Bolão do Revoada, ${firstName}.\n` +
    `Entrada R$ 100, premiação 70/20/10 do bolo total.\n` +
    `Os valores atualizados ficam na aba Prêmio. Toque abaixo pra começar.`
  )
}

export function rankingMessage(rankings: BotRankingEntry[]): string {
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

export function myPointsMessage(_user: User, totalPoints: number): string {
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

export function welcomeGroupMessage(firstName: string, _botUsername: string): string {
  return (
    `${firstName}, bem-vindo ao Bolão do Revoada.\n` +
    `Toque no botão abaixo pra iniciar conversa privada com o bot.`
  )
}

// ---------------------------------------------------------------------------
// Formatters de notificações automáticas (Fase 6)
// ---------------------------------------------------------------------------

function formatTime(kickoffAt: Date | number): string {
  const d = kickoffAt instanceof Date ? kickoffAt : new Date((kickoffAt as number) * 1000)
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function formatMatchLine(m: Match): string {
  const { flag: hf, name: hName } = getTeamDisplay(m.home_team_code)
  const { flag: af, name: aName } = getTeamDisplay(m.away_team_code)
  const t = formatTime(m.kickoff_at instanceof Date ? m.kickoff_at : new Date((m.kickoff_at as number) * 1000))
  return `${hf} ${hName} x ${aName} ${af} — ${t}`
}

export function morningDigestMessage(
  todayMatches: Match[],
  usersWithoutByMatch: { match_id: number; users: User[] }[]
): string {
  const plural = todayMatches.length === 1 ? 'jogo hoje' : 'jogos hoje'
  const lines: string[] = [`Bom dia. ${todayMatches.length} ${plural}.`, '']

  for (const m of todayMatches) {
    lines.push(formatMatchLine(m))
    const missing = usersWithoutByMatch.find((x) => x.match_id === m.id)?.users ?? []
    if (missing.length > 0) {
      const mentions = missing.map((u) => u.telegram_username ? `@${u.telegram_username}` : u.first_name).join(' ')
      lines.push(`  Sem palpite: ${mentions}. Andem.`)
    }
  }

  return lines.join('\n')
}

export function preMatchTopMessage(match: Match, usersWithoutPrediction: User[]): string {
  const { flag: hf, name: hName } = getTeamDisplay(match.home_team_code)
  const { flag: af, name: aName } = getTeamDisplay(match.away_team_code)
  const t = formatTime(match.kickoff_at instanceof Date ? match.kickoff_at : new Date((match.kickoff_at as number) * 1000))

  let base = `⏱ ${hf} ${hName} x ${aName} ${af} — ${t}.`

  if (usersWithoutPrediction.length > 0) {
    const mentions = usersWithoutPrediction
      .map((u) => u.telegram_username ? `@${u.telegram_username}` : u.first_name)
      .join(' ')
    base += ` Sem palpite: ${mentions}. Andem.`
  }

  return base
}

export function preMatchDmMessage(match: Match, appUrl: string): string {
  const { flag: hf, name: hName } = getTeamDisplay(match.home_team_code)
  const { flag: af, name: aName } = getTeamDisplay(match.away_team_code)
  const t = formatTime(match.kickoff_at instanceof Date ? match.kickoff_at : new Date((match.kickoff_at as number) * 1000))
  return (
    `${hf} ${hName} x ${aName} ${af} em ${t}.\n` +
    `Você ainda não palpitou. Toque pra abrir: ${appUrl}`
  )
}

export function postMatchTopMessage(match: Match, topN: RankingEntry[]): string {
  const { flag: hf, name: hName } = getTeamDisplay(match.home_team_code)
  const { flag: af, name: aName } = getTeamDisplay(match.away_team_code)
  const result = `${match.home_score ?? '?'}x${match.away_score ?? '?'}`
  const lines: string[] = [`${hf} ${hName} ${result} ${aName} ${af}.`]

  if (topN.length > 0) {
    lines.push('')
    lines.push('Top do ranking:')
    for (const e of topN) {
      lines.push(`${e.position}. ${e.name} — ${e.total_points} pts`)
    }
  }

  return lines.join('\n')
}

export function eveningSummaryMessage(finishedMatches: Match[], topN: RankingEntry[]): string {
  const plural = finishedMatches.length === 1 ? 'jogo' : 'jogos'
  const lines: string[] = [`Fim do dia. ${finishedMatches.length} ${plural} finalizados.`]

  for (const m of finishedMatches) {
    const { flag: hf, name: hName } = getTeamDisplay(m.home_team_code)
    const { flag: af, name: aName } = getTeamDisplay(m.away_team_code)
    lines.push(`${hf} ${hName} ${m.home_score ?? '?'}x${m.away_score ?? '?'} ${aName} ${af}`)
  }

  if (topN.length > 0) {
    lines.push('')
    lines.push('Top 3:')
    for (const e of topN) {
      lines.push(`${e.position}. ${e.name} — ${e.total_points} pts`)
    }
  }

  return lines.join('\n')
}

const STAGE_LABEL_PT: Record<string, string> = {
  r32: '32-avos de final',
  r16: '16-avos de final',
  qf: 'quartas de final',
  sf: 'semifinais',
  '3rd': 'disputa de terceiro lugar',
  final: 'final',
}

export function phaseOpenMessage(stage: string, closesAt: Date): string {
  const label = STAGE_LABEL_PT[stage] ?? stage
  const closes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(closesAt)
  return `Palpites das ${label} abertos. Fecha em ${closes}. Quem não palpitar fica de fora.`
}

export function phaseChampionMessage(
  block: 'group' | 'knockout',
  names: string[],
  points: number
): string {
  const nameStr = names.join(' e ')
  if (block === 'group') {
    return `🏆 Fase de grupos encerrada! Campeão da fase: ${nameStr} com ${points} pts. Parabéns!`
  }
  return `🏆 Eliminatórias encerradas! Campeão do mata-mata: ${nameStr} com ${points} pts. Parabéns!`
}

export function reconciliationAlertMessage(
  matchId: number,
  home: string,
  away: string,
  adminUrl: string
): string {
  return (
    `⚠️ Conflito persistente: ${home} x ${away} (match_id=${matchId}).\n` +
    `5+ ciclos sem consenso entre as fontes.\n` +
    `Veja: ${adminUrl}`
  )
}

const BRACKET_STAGE_LABELS: Record<string, string> = {
  r32: '16-avos de final',
  r16: 'Oitavas de final',
  qf: 'Quartas de final',
  sf: 'Semifinais',
  '3rd': '3º lugar',
  final: 'Final',
}

export function bracketDefinedMessage(
  stage: string,
  stageMatches: {
    home_team_code: string
    home_team_name: string
    away_team_code: string
    away_team_name: string
  }[]
): string {
  const label = BRACKET_STAGE_LABELS[stage] ?? stage
  const lines: string[] = [`⚔️ Confrontos definidos: ${label}!`, '']
  for (const m of stageMatches) {
    const { flag: hf } = getTeamDisplay(m.home_team_code)
    const { flag: af } = getTeamDisplay(m.away_team_code)
    lines.push(`${hf} ${m.home_team_name} × ${m.away_team_name} ${af}`)
  }
  lines.push('')
  lines.push('Bora palpitar antes que feche. Quem vacilar no mata-mata tá fora da briga.')
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// predictionsRevealedMessage
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// BRT = UTC-3 (Brasil aboliu horário de verão)
function toBrtTime(ts: Date | null | undefined): string | null {
  if (!ts) return null
  const brt = new Date(ts.getTime() - 3 * 60 * 60 * 1000)
  const h = brt.getUTCHours().toString().padStart(2, '0')
  const m = brt.getUTCMinutes().toString().padStart(2, '0')
  return `${h}h${m}`
}

export type PredictionRow = {
  name: string
  home: number
  away: number
  qualified?: string
  palpited_at?: Date | null
}

export function predictionsRevealedMessage(
  match: { home_team_code: string; away_team_code: string },
  rows: PredictionRow[],
  missing: string[]
): string {
  if (rows.length === 0) return ''

  const { flag: hf, name: hName } = getTeamDisplay(match.home_team_code)
  const { flag: af, name: aName } = getTeamDisplay(match.away_team_code)

  const header = `🔓 Palpites revelados\n${hf} ${hName} x ${aName} ${af}`

  const items = rows.map((r) => {
    const isDraw = r.home === r.away
    let suffix = ''
    if (isDraw && r.qualified) {
      const qualCode = r.qualified === 'home' ? match.home_team_code : match.away_team_code
      suffix = ` (passa: ${getTeamDisplay(qualCode).name})`
    }
    const time = toBrtTime(r.palpited_at)
    const timeStr = time ? ` · ${time}` : ''
    return `${escapeHtml(r.name)}: ${r.home}-${r.away}${suffix}${timeStr}`
  })

  const parts = [header, '', ...items]

  if (missing.length > 0) {
    parts.push('', `Sem palpite: ${missing.map(escapeHtml).join(', ')}`)
  }

  return parts.join('\n')
}

export function unscoredMatchAlertMessage(match: {
  id: number
  home_team_name: string
  away_team_name: string
  result_locked_at: Date | number | null
}): string {
  const locked =
    match.result_locked_at instanceof Date
      ? match.result_locked_at
      : new Date((match.result_locked_at as number) * 1000)
  const lockedStr = locked.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
  return (
    `⚠️ Pontuação não computada: ${match.home_team_name} x ${match.away_team_name} (match_id=${match.id})\n` +
    `Travado em: ${lockedStr}\n` +
    `Rodar recálculo manual: POST /api/admin/recalculate {"match_id": ${match.id}}`
  )
}

export function staleMatchAlertMessage(match: {
  id: number
  home_team_name: string
  away_team_name: string
  kickoff_at: Date | number
  status: string
}): string {
  const kickoff =
    match.kickoff_at instanceof Date
      ? match.kickoff_at
      : new Date((match.kickoff_at as number) * 1000)
  const kickoffStr = kickoff.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
  return (
    `⚠️ Resultado não travado: ${match.home_team_name} x ${match.away_team_name} (match_id=${match.id})\n` +
    `Kickoff: ${kickoffStr} | Status: ${match.status}\n` +
    `Travar manualmente ou aguardar o próximo poll-live-matches.`
  )
}
