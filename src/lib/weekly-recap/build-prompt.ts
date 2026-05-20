import type { WeeklyRecapData } from './collect-data'

const STAGE_LABELS: Record<string, string> = {
  group: 'Fase de Grupos',
  r32: 'Rodada de 32',
  r16: 'Oitavas',
  qf: 'Quartas',
  sf: 'Semifinal',
  '3rd': 'Disputa de 3º',
  final: 'Final',
}

function formatKickoff(date: Date): string {
  // Exibe horário em BRT (UTC-3)
  const brt = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  const day = String(brt.getUTCDate()).padStart(2, '0')
  const month = String(brt.getUTCMonth() + 1).padStart(2, '0')
  const hour = String(brt.getUTCHours()).padStart(2, '0')
  const min = String(brt.getUTCMinutes()).padStart(2, '0')
  return `${day}/${month} ${hour}h${min} BRT`
}

function formatDateBrt(date: Date): string {
  const brt = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  const day = String(brt.getUTCDate()).padStart(2, '0')
  const month = String(brt.getUTCMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

function displayName(first: string, last: string | null): string {
  return last ? `${first} ${last}` : first
}

export function buildRecapPrompt(data: WeeklyRecapData): { system: string; user: string } {
  const system = `Você é o Narrator do Bolão do Revoada, um bolão privado da Copa do Mundo 2026 entre ${data.allUsers.length} amigos. \
Seu papel é escrever o recap semanal do bolão com personalidade: zoeiro, sarcástico, bem-humorado, direto, \
sem formalidade. Use português brasileiro coloquial — "tá", "né", "cara", "mano", "pô" são bem-vindos. \
JAMAIS use português lusitano ("Olá", "rapazes", "fixe", "pois"). \
Trate cada participante pelo primeiro nome. Pode zoar levemente quem errou feio ou ficou em último, \
exalte quem subiu no ranking, faça piada de palpites absurdos com bom humor. \
Escreva entre 200 e 400 palavras. Use parágrafos curtos. \
Não use emojis decorativos (somente bandeiras de países quando citar seleções, ex: 🇧🇷 🇦🇷). \
JAMAIS use #, ##, ###, _, *, **, ou qualquer caractere de formatação markdown. O texto será enviado como string crua no Telegram (parse_mode null). Headers de seção, se usados, devem ser em CAIXA ALTA simples sem nenhum caractere especial antes ou depois. \
REGRA INVIOLÁVEL DE FIDELIDADE AOS DADOS: Você só pode mencionar times, jogos, placares, nomes de participantes, pontuações, posições no ranking, datas e fatos que estejam EXPLICITAMENTE listados no user prompt. JAMAIS invente jogos, JAMAIS adicione partidas extras pra completar uma frase, JAMAIS mencione seleções ou jogadores que não foram citados. Se a seção 'Próximos jogos' tem 3 partidas, você lista exatamente 3 partidas. Se tem 1, lista 1. Se está vazia, omite a seção. Inventar dado é o pior erro possível neste recap e quebra a confiança do grupo. \
Estrutura sugerida (mas adapte com criatividade): \
abertura com o que rolou na semana, destaques do ranking, melhor/pior palpite, próximos jogos.`

  const lines: string[] = []

  lines.push(`## Semana do bolão: ${formatDateBrt(data.windowStart)} a ${formatDateBrt(data.windowEnd)}`)
  lines.push('')

  // Participantes
  lines.push('### Participantes')
  lines.push(data.allUsers.map((u) => displayName(u.first_name, u.last_name)).join(', '))
  lines.push('')

  // Jogos finalizados
  lines.push('### Jogos da semana')
  for (const m of data.finishedMatches) {
    const stage = STAGE_LABELS[m.stage] ?? m.stage
    lines.push(
      `- ${m.home_team_name} ${m.home_score} x ${m.away_score} ${m.away_team_name} (${stage}, ${formatKickoff(m.kickoff_at)})`,
    )
  }
  lines.push('')

  // Ranking antes / depois
  if (data.rankingBefore.length > 0) {
    lines.push('### Ranking antes da semana')
    for (const e of data.rankingBefore) {
      lines.push(`${e.position}. ${displayName(e.first_name, e.last_name)}`)
    }
    lines.push('')
  }

  lines.push('### Ranking atual')
  for (const e of data.rankingAfter) {
    lines.push(`${e.position}. ${displayName(e.first_name, e.last_name)} — ${e.total_points} pts`)
  }
  lines.push('')

  // Movimentos
  if (data.biggestClimber) {
    const c = data.biggestClimber
    lines.push(
      `### Maior subida: ${c.first_name} (${c.positionBefore}º → ${c.positionAfter}º, +${c.delta} posições)`,
    )
  }
  if (data.biggestFaller) {
    const f = data.biggestFaller
    lines.push(
      `### Maior queda: ${f.first_name} (${f.positionBefore}º → ${f.positionAfter}º, ${f.delta} posições)`,
    )
  }
  if (data.biggestClimber || data.biggestFaller) lines.push('')

  // Destaques de palpites
  if (data.bestGuess) {
    const b = data.bestGuess
    lines.push(`### Melhor palpite da semana`)
    lines.push(
      `${b.first_name}: chutou ${b.predicted.home_score}x${b.predicted.away_score} em ${b.match.home_team_name} x ${b.match.away_team_name} (real: ${b.match.home_score}x${b.match.away_score}) — ${b.points} pts`,
    )
    lines.push('')
  }

  if (data.worstGuess) {
    const w = data.worstGuess
    lines.push(`### Palpite mais errado (0 pts)`)
    lines.push(
      `${w.first_name}: chutou ${w.predicted.home_score}x${w.predicted.away_score} em ${w.match.home_team_name} x ${w.match.away_team_name} (real: ${w.match.home_score}x${w.match.away_score}) — diferença de ${w.diff} gols`,
    )
    lines.push('')
  }

  // Próximos jogos
  if (data.upcomingMatches.length > 0) {
    lines.push('### Próximos jogos (7 dias)')
    for (const m of data.upcomingMatches) {
      const stage = STAGE_LABELS[m.stage] ?? m.stage
      const local = m.city ? ` — ${m.city}` : ''
      lines.push(`- ${m.home_team_name} x ${m.away_team_name} (${stage}${local}, ${formatKickoff(m.kickoff_at)})`)
    }
  }

  const user = lines.join('\n')

  return { system, user }
}
