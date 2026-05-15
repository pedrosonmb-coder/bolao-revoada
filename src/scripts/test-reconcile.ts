import { db } from '@/lib/db'
import { matches, matchSnapshots } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { reconcileMatch } from '@/lib/reconciliation'
import { env } from '@/lib/env'

async function fetchFinishedPLMatchId(): Promise<{ id: number; label: string }> {
  const res = await fetch(
    'https://api.football-data.org/v4/competitions/PL/matches?status=FINISHED',
    { headers: { 'X-Auth-Token': env.FOOTBALL_DATA_API_KEY } }
  )

  if (!res.ok) {
    throw new Error(`football-data retornou HTTP ${res.status} ao listar jogos da PL`)
  }

  const data = await res.json()
  const list: Array<{ id: number; homeTeam: { name?: string }; awayTeam: { name?: string } }> =
    data.matches ?? []

  if (list.length === 0) {
    throw new Error('Nenhum jogo FINISHED retornado pela PL. Tente outra competição.')
  }

  const first = list[0]
  return {
    id: first.id,
    label: `${first.homeTeam.name ?? '?'} x ${first.awayTeam.name ?? '?'}`,
  }
}

async function main() {
  console.log('1. Buscando jogo finalizado da Premier League...')
  const { id: fdId, label } = await fetchFinishedPLMatchId()
  console.log(`   fd_id=${fdId}  (${label})`)

  // Garante que não existe fd_id duplicado no banco
  const existing = await db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.fd_id, fdId))
    .limit(1)

  if (existing.length > 0) {
    throw new Error(
      `fd_id=${fdId} já existe no banco (id=${existing[0].id}). Use outro jogo ou limpe o banco antes.`
    )
  }

  const now = new Date()
  const kickoffAt = new Date(now.getTime() - 60 * 60 * 1000)        // now - 1h
  const predictionsCloseAt = new Date(now.getTime() - 65 * 60 * 1000) // now - 65min

  console.log('\n2. Inserindo match fake...')
  const [inserted] = await db
    .insert(matches)
    .values({
      fd_id: fdId,
      stage: 'group',
      home_team_code: 'AAA',
      away_team_code: 'BBB',
      home_team_name: 'Test A',
      away_team_name: 'Test B',
      kickoff_at: kickoffAt,
      predictions_close_at: predictionsCloseAt,
      status: 'scheduled',
    })
    .returning()

  console.log(`   match inserido: id=${inserted.id}, fd_id=${fdId}`)

  try {
    console.log('\n3. Chamando reconcileMatch...')
    const result = await reconcileMatch(inserted)

    console.log('\n=== RESULTADO DA RECONCILIAÇÃO ===')
    console.log(`kind: ${result.kind}`)

    if (result.kind === 'agreed') {
      console.log('agreeing_sources:', result.agreeing_sources)
      console.log('snapshot:')
      console.dir(result.snapshot, { depth: null })
    } else if (result.kind === 'partial') {
      console.log('only_source:', result.only_source)
      console.log('snapshot:')
      console.dir(result.snapshot, { depth: null })
    } else if (result.kind === 'conflict') {
      console.log('reason:', result.reason)
      console.log('snapshots:')
      console.dir(result.snapshots, { depth: null })
    } else {
      // all_failed
      console.log('reason:', result.reason)
    }
  } finally {
    console.log('\n4. Limpando dados de teste...')
    await db.delete(matchSnapshots).where(eq(matchSnapshots.match_id, inserted.id))
    await db.delete(matches).where(eq(matches.fd_id, fdId))
    console.log('   match fake removido.')
  }
}

main().catch((err) => {
  console.error('\nErro fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
