/**
 * Testa a geração do recap semanal via Anthropic API.
 *
 * Uso:
 *   pnpm test:weekly-recap --mock-data   → dados fake hardcoded, não precisa DB com jogos reais
 *   pnpm test:weekly-recap               → janela real, NOTIFICATIONS_DRY_RUN forçado
 *
 * Nunca envia mensagem real ao Telegram.
 */

// Força dry-run antes de qualquer import que possa checar a env var
process.env.NOTIFICATIONS_DRY_RUN = 'true'

import { getRecapWindow } from '@/lib/weekly-recap/window'
import { collectWeeklyRecapData } from '@/lib/weekly-recap/collect-data'
import { buildRecapMessage } from '@/lib/weekly-recap/build-recap-message'
import type { WeeklyRecapData } from '@/lib/weekly-recap/collect-data'

const USE_MOCK = process.argv.includes('--mock-data')

// ---------------------------------------------------------------------------
// Dados fake para testes antes da Copa
// ---------------------------------------------------------------------------
const MOCK_DATA: WeeklyRecapData = {
  isoYear: 2026,
  isoWeek: 25,
  windowStart: new Date('2026-06-08T03:00:00Z'), // Seg 00:00 BRT
  windowEnd: new Date('2026-06-15T01:00:00Z'),   // Seg 22:00 BRT
  allUsers: [
    { user_id: 1, name: 'Participante A' },
    { user_id: 2, name: 'Participante B' },
    { user_id: 3, name: 'Participante C' },
    { user_id: 4, name: 'Participante D' },
    { user_id: 5, name: 'Participante E' },
    { user_id: 6, name: 'Participante F' },
    { user_id: 7, name: 'Participante G' },
    { user_id: 8, name: 'Participante H' },
    { user_id: 9, name: 'Participante I' },
  ],
  finishedMatches: [
    {
      id: 1,
      home_team_name: 'Brasil',
      away_team_name: 'México',
      home_score: 3,
      away_score: 1,
      kickoff_at: new Date('2026-06-10T22:00:00Z'),
      stage: 'group',
      venue: 'MetLife Stadium',
    },
    {
      id: 2,
      home_team_name: 'Argentina',
      away_team_name: 'Equador',
      home_score: 2,
      away_score: 0,
      kickoff_at: new Date('2026-06-11T01:00:00Z'),
      stage: 'group',
      venue: 'SoFi Stadium',
    },
    {
      id: 3,
      home_team_name: 'Portugal',
      away_team_name: 'Gana',
      home_score: 3,
      away_score: 2,
      kickoff_at: new Date('2026-06-12T18:00:00Z'),
      stage: 'group',
      venue: 'AT&T Stadium',
    },
  ],
  rankingBefore: [
    { user_id: 3, name: 'Participante C', position: 1, total_points: 120 },
    { user_id: 1, name: 'Participante A', position: 2, total_points: 110 },
    { user_id: 6, name: 'Participante F', position: 3, total_points: 100 },
    { user_id: 2, name: 'Participante B', position: 4, total_points: 95 },
    { user_id: 5, name: 'Participante E', position: 5, total_points: 88 },
    { user_id: 4, name: 'Participante D', position: 6, total_points: 80 },
    { user_id: 7, name: 'Participante G', position: 7, total_points: 72 },
    { user_id: 8, name: 'Participante H', position: 8, total_points: 65 },
    { user_id: 9, name: 'Participante I', position: 9, total_points: 50 },
  ],
  rankingAfter: [
    { user_id: 1, name: 'Participante A', position: 1, total_points: 185 },
    { user_id: 3, name: 'Participante C', position: 2, total_points: 175 },
    { user_id: 2, name: 'Participante B', position: 3, total_points: 165 },
    { user_id: 6, name: 'Participante F', position: 4, total_points: 155 },
    { user_id: 4, name: 'Participante D', position: 5, total_points: 140 },
    { user_id: 5, name: 'Participante E', position: 6, total_points: 128 },
    { user_id: 7, name: 'Participante G', position: 7, total_points: 112 },
    { user_id: 9, name: 'Participante I', position: 8, total_points: 100 },
    { user_id: 8, name: 'Participante H', position: 9, total_points: 85 },
  ],
  biggestClimber: {
    user_id: 1,
    name: 'Participante A',
    positionBefore: 2,
    positionAfter: 1,
    delta: 1,
  },
  biggestFaller: {
    user_id: 6,
    name: 'Participante F',
    positionBefore: 3,
    positionAfter: 4,
    delta: -1,
  },
  bestGuess: {
    user_id: 2,
    name: 'Participante B',
    match: { home_team_name: 'Brasil', away_team_name: 'México', home_score: 3, away_score: 1 },
    predicted: { home_score: 3, away_score: 1 },
    points: 75,
  },
  worstGuess: {
    user_id: 9,
    name: 'Participante I',
    match: { home_team_name: 'Portugal', away_team_name: 'Gana', home_score: 3, away_score: 2 },
    predicted: { home_score: 0, away_score: 1 },
    diff: 4,
  },
  upcomingMatches: [
    {
      home_team_name: 'França',
      away_team_name: 'Bélgica',
      kickoff_at: new Date('2026-06-16T22:00:00Z'),
      stage: 'group',
      venue: 'Levi\'s Stadium',
      city: 'Santa Clara',
    },
    {
      home_team_name: 'Espanha',
      away_team_name: 'Croácia',
      kickoff_at: new Date('2026-06-17T01:00:00Z'),
      stage: 'group',
      venue: 'Rose Bowl',
      city: 'Los Angeles',
    },
    {
      home_team_name: 'Alemanha',
      away_team_name: 'Japão',
      kickoff_at: new Date('2026-06-17T18:00:00Z'),
      stage: 'group',
      venue: 'Hard Rock Stadium',
      city: 'Miami',
    },
  ],
  weeklyPoints: {
    1: 75,  // A
    3: 55,  // C
    2: 70,  // B
    6: 55,  // F
    4: 60,  // D
    5: 40,  // E
    7: 40,  // G
    9: 50,  // I
    8: 20,  // H
  },
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Teste: Geração de Recap Semanal ===\n')
  console.log(`Modo: ${USE_MOCK ? 'MOCK (dados fake)' : 'REAL (janela atual, DRY_RUN)'}\n`)

  let data: WeeklyRecapData | null

  if (USE_MOCK) {
    data = MOCK_DATA
    console.log(`Janela mock: W${data.isoWeek}/${data.isoYear}`)
    console.log(`Jogos finalizados: ${data.finishedMatches.length}`)
  } else {
    const now = new Date()
    const window = getRecapWindow(now)
    console.log(
      `Janela real: ${window.isoYear}-W${String(window.isoWeek).padStart(2, '0')} ` +
        `(${window.startUtc.toISOString()} → ${window.endUtc.toISOString()})`,
    )

    console.log('Coletando dados do banco...')
    data = await collectWeeklyRecapData(window)

    if (!data) {
      console.log('\n[SKIP] Nenhum jogo finalizado na janela. Nada a gerar.')
      return
    }

    console.log(`Jogos finalizados: ${data.finishedMatches.length}`)
    console.log(`Participantes: ${data.allUsers.length}`)
  }

  const text = buildRecapMessage(data)
  console.log('\n--- MENSAGEM GERADA ---')
  console.log(text)
  console.log('--- FIM DA MENSAGEM ---\n')
  console.log(`Tamanho: ${text.length} caracteres`)
}

main().catch((err) => {
  console.error('\nErro fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
