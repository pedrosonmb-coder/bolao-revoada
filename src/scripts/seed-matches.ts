import { db } from '@/lib/db'
import { matches, phaseWindows } from '@/lib/db/schema'
import { fetchAllMatchesFromFootballData } from '@/lib/data-sources/football-data'
import { eq, min, max, sql } from 'drizzle-orm'

// Mapeamento de stage da API → enum interno
const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: 'group',
  LAST_32: 'r32',
  LAST_16: 'r16',
  ROUND_OF_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  THIRD_PLACE: '3rd',
  PLAY_OFF_FOR_THIRD_PLACE: '3rd',
  FINAL: 'final',
}

const EXPECTED: Record<string, number> = {
  group: 72,
  r32: 16,
  r16: 8,
  qf: 4,
  sf: 2,
  '3rd': 1,
  final: 1,
}

interface ApiMatch {
  id: number
  utcDate: string
  status: string
  stage: string
  group?: string | null
  homeTeam: { tla?: string | null; name?: string | null }
  awayTeam: { tla?: string | null; name?: string | null }
}

async function main() {
  console.log('Importando 104 jogos da Copa 2026...')
  console.log('⏳ Buscando da football-data.org')

  const rawMatches = (await fetchAllMatchesFromFootballData()) as ApiMatch[]

  console.log(`✅ ${rawMatches.length} jogos retornados`)

  if (rawMatches.length === 0) {
    console.error('❌ Nenhum jogo retornado. Verifique FOOTBALL_DATA_API_KEY.')
    process.exit(1)
  }

  // Ordenar cronologicamente para calcular match_number
  const sorted = [...rawMatches].sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  )

  // Contar por stage
  const distribution: Record<string, number> = {}
  const unknownStages: string[] = []

  for (const m of sorted) {
    const stage = STAGE_MAP[m.stage]
    if (!stage) {
      if (!unknownStages.includes(m.stage)) unknownStages.push(m.stage)
      continue
    }
    distribution[stage] = (distribution[stage] ?? 0) + 1
  }

  if (unknownStages.length > 0) {
    console.warn(`⚠️  Stages desconhecidos (ignorados): ${unknownStages.join(', ')}`)
  }

  console.log('✅ Distribuição:')
  for (const [stage, count] of Object.entries(distribution)) {
    const expected = EXPECTED[stage] ?? '?'
    const ok = count === expected ? '✅' : '❌'
    console.log(`   ${ok} ${stage}: ${count} (esperado: ${expected})`)
  }

  // Validação de distribuição
  let hasError = false
  for (const [stage, expected] of Object.entries(EXPECTED)) {
    const actual = distribution[stage] ?? 0
    if (actual !== expected) {
      console.error(`❌ Contagem errada na fase "${stage}": ${actual} (esperado: ${expected})`)
      hasError = true
    }
  }

  if (hasError) {
    console.error('\n❌ Distribuição incorreta. Verifique o mapeamento de stages.')
    process.exit(1)
  }

  // Upsert dos jogos
  let matchNumber = 0
  for (const m of sorted) {
    const stage = STAGE_MAP[m.stage]
    if (!stage) continue

    matchNumber++
    const kickoff = new Date(m.utcDate)
    const predictionsClose = new Date(kickoff.getTime() - 5 * 60 * 1000)

    const groupName =
      stage === 'group' && m.group ? m.group.replace('GROUP_', '') : null

    await db
      .insert(matches)
      .values({
        fd_id: m.id,
        stage,
        group_name: groupName,
        match_number: matchNumber,
        home_team_code: m.homeTeam.tla ?? 'TBD',
        home_team_name: m.homeTeam.name ?? 'A definir',
        away_team_code: m.awayTeam.tla ?? 'TBD',
        away_team_name: m.awayTeam.name ?? 'A definir',
        kickoff_at: kickoff,
        predictions_close_at: predictionsClose,
        status: 'scheduled',
      })
      .onConflictDoUpdate({
        target: matches.fd_id,
        set: {
          stage,
          group_name: groupName,
          match_number: matchNumber,
          home_team_code: m.homeTeam.tla ?? 'TBD',
          home_team_name: m.homeTeam.name ?? 'A definir',
          away_team_code: m.awayTeam.tla ?? 'TBD',
          away_team_name: m.awayTeam.name ?? 'A definir',
          kickoff_at: kickoff,
          predictions_close_at: predictionsClose,
        },
      })
  }

  // Popula phase_windows
  // Busca timestamps min/max por stage
  const getMin = async (stage: string): Promise<Date | null> => {
    const [row] = await db
      .select({ v: min(matches.kickoff_at) })
      .from(matches)
      .where(eq(matches.stage, stage))
    return row?.v ? (row.v instanceof Date ? row.v : new Date((row.v as number) * 1000)) : null
  }

  const getMax = async (stage: string): Promise<Date | null> => {
    const [row] = await db
      .select({ v: max(matches.kickoff_at) })
      .from(matches)
      .where(eq(matches.stage, stage))
    return row?.v ? (row.v instanceof Date ? row.v : new Date((row.v as number) * 1000)) : null
  }

  const minus5m = (d: Date) => new Date(d.getTime() - 5 * 60 * 1000)

  const groupOpens = new Date('2026-06-01T03:00:00Z') // 00:00 BRT = 03:00 UTC

  const windows: Array<{ stage: string; opens_at: Date; closes_at: Date; multiplier: number }> = []

  const minGroup = await getMin('group')
  const maxGroup = await getMax('group')
  const minR32 = await getMin('r32')
  const maxR32 = await getMax('r32')
  const minR16 = await getMin('r16')
  const maxR16 = await getMax('r16')
  const minQf = await getMin('qf')
  const maxQf = await getMax('qf')
  const minSf = await getMin('sf')
  const maxSf = await getMax('sf')
  const minThird = await getMin('3rd')

  if (!minGroup || !maxGroup || !minR32 || !maxR32 || !minR16 || !maxR16 || !minQf || !maxQf || !minSf || !maxSf || !minThird) {
    console.error('❌ Não conseguiu calcular timestamps para phase_windows')
    process.exit(1)
  }

  windows.push({ stage: 'group', opens_at: groupOpens, closes_at: minus5m(minGroup), multiplier: 1.0 })
  windows.push({ stage: 'r32', opens_at: maxGroup, closes_at: minus5m(minR32), multiplier: 1.5 })
  windows.push({ stage: 'r16', opens_at: maxR32, closes_at: minus5m(minR16), multiplier: 2.0 })
  windows.push({ stage: 'qf', opens_at: maxR16, closes_at: minus5m(minQf), multiplier: 2.0 })
  windows.push({ stage: 'sf', opens_at: maxQf, closes_at: minus5m(minSf), multiplier: 2.0 })
  windows.push({ stage: 'final', opens_at: maxSf, closes_at: minus5m(minThird), multiplier: 2.5 })

  for (const w of windows) {
    await db
      .insert(phaseWindows)
      .values(w)
      .onConflictDoUpdate({
        target: phaseWindows.stage,
        set: {
          opens_at: w.opens_at,
          closes_at: w.closes_at,
          multiplier: w.multiplier,
        },
      })
  }

  console.log(`✅ Phase windows populadas (${windows.length} fases)`)
  console.log(`✅ Seed completo: ${matchNumber} partidas no banco`)
}

main().catch((err) => {
  console.error('❌ Seed falhou:', err instanceof Error ? err.message : err)
  process.exit(1)
})
