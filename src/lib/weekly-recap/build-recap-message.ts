import type { WeeklyRecapData } from './collect-data'

const STAGE_LABELS: Record<string, string> = {
  group: 'Grupos',
  r32: 'R. de 32',
  r16: 'Oitavas',
  qf: 'Quartas',
  sf: 'Semifinal',
  '3rd': '3º lugar',
  final: 'Final',
}

function brtDate(utcDate: Date): Date {
  return new Date(utcDate.getTime() - 3 * 60 * 60 * 1000)
}

function fmtDate(utcDate: Date): string {
  const d = brtDate(utcDate)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function fmtKickoff(utcDate: Date): string {
  const d = brtDate(utcDate)
  const date = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  const time = `${String(d.getUTCHours()).padStart(2, '0')}h${String(d.getUTCMinutes()).padStart(2, '0')}`
  return `${date} ${time} BRT`
}

export function buildRecapMessage(data: WeeklyRecapData): string {
  const lines: string[] = []

  lines.push('BOLÃO DO REVOADA')
  lines.push(`Recap da semana: ${fmtDate(data.windowStart)} a ${fmtDate(data.windowEnd)}`)
  lines.push('')

  // Jogos da semana
  lines.push(`JOGOS DA SEMANA (${data.finishedMatches.length})`)
  for (const m of data.finishedMatches) {
    const stage = STAGE_LABELS[m.stage] ?? m.stage
    lines.push(`• ${m.home_team_name} ${m.home_score} x ${m.away_score} ${m.away_team_name} — ${stage}, ${fmtKickoff(m.kickoff_at)}`)
  }
  lines.push('')

  // Ranking com pontos da semana e movimento de posição
  lines.push('RANKING')
  const positionBefore = new Map(data.rankingBefore.map((e) => [e.user_id, e.position]))
  for (const e of data.rankingAfter) {
    const before = positionBefore.get(e.user_id)
    let movement = ''
    if (before != null && before !== e.position) {
      const delta = before - e.position
      movement = delta > 0 ? ` ▲${delta}` : ` ▼${Math.abs(delta)}`
    }
    const wpts = data.weeklyPoints[e.user_id] ?? 0
    const weekStr = wpts > 0 ? ` (+${wpts} pts na semana)` : ''
    lines.push(`${e.position}. ${e.name} — ${e.total_points} pts${weekStr}${movement}`)
  }
  lines.push('')

  // Destaques — só renderiza a seção se houver algum dado
  const hasHighlights = !!(data.biggestClimber || data.biggestFaller || data.bestGuess || data.worstGuess)
  if (hasHighlights) {
    lines.push('DESTAQUES DA SEMANA')
    if (data.biggestClimber) {
      const c = data.biggestClimber
      lines.push(`Maior subida: ${c.name} (${c.positionBefore}º → ${c.positionAfter}º)`)
    }
    if (data.biggestFaller) {
      const f = data.biggestFaller
      lines.push(`Maior queda: ${f.name} (${f.positionBefore}º → ${f.positionAfter}º)`)
    }
    if (data.bestGuess) {
      const b = data.bestGuess
      lines.push(
        `Melhor palpite: ${b.name} — ${b.predicted.home_score}x${b.predicted.away_score}` +
          ` em ${b.match.home_team_name} x ${b.match.away_team_name}` +
          ` (real: ${b.match.home_score}x${b.match.away_score}) — ${b.points} pts`,
      )
    }
    if (data.worstGuess) {
      const w = data.worstGuess
      lines.push(
        `Maior tropeço: ${w.name} — ${w.predicted.home_score}x${w.predicted.away_score}` +
          ` em ${w.match.home_team_name} x ${w.match.away_team_name}` +
          ` (real: ${w.match.home_score}x${w.match.away_score}) — ${w.diff} gols de diferença`,
      )
    }
    lines.push('')
  }

  // Próximos jogos
  if (data.upcomingMatches.length > 0) {
    lines.push('PRÓXIMOS JOGOS (7 DIAS)')
    for (const m of data.upcomingMatches) {
      const stage = STAGE_LABELS[m.stage] ?? m.stage
      const city = m.city ? ` — ${m.city}` : ''
      lines.push(`• ${m.home_team_name} x ${m.away_team_name} — ${stage}, ${fmtKickoff(m.kickoff_at)}${city}`)
    }
  }

  return lines.join('\n').trimEnd()
}
