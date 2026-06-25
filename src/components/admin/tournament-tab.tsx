'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminFetch } from '@/lib/api/admin'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { getAllTeams } from '@/lib/teams'
import { Skeleton } from '@/components/ui/skeleton'
import { normalizeName } from '@/lib/scoring/normalize-name'

type PredictionGroup = { normalized: string; sample: string; count: number }

type TournamentData = {
  results: {
    id: number
    champion_code: string | null
    runner_up_code: string | null
    semifinalists: string | null
    top_scorer_name: string | null
    best_player_name: string | null
    best_young_player_name: string | null
    finalized_at: string | null
  } | null
  prediction_counts: {
    top_scorer: PredictionGroup[]
    best_player: PredictionGroup[]
    best_young_player: PredictionGroup[]
  }
}

const allTeams = getAllTeams()

function countMatching(groups: PredictionGroup[], fieldValue: string): number {
  if (!fieldValue.trim()) return 0
  const aliases = fieldValue.split('|').map(normalizeName).filter(Boolean)
  return groups.filter((g) => aliases.includes(g.normalized)).reduce((sum, g) => sum + g.count, 0)
}

function appendAlias(current: string, sample: string): string {
  if (!current.trim()) return sample
  const parts = current.split('|').map((p) => p.trim())
  if (parts.includes(sample)) return current
  return [...parts, sample].join('|')
}

export function TournamentTab({ telegramId }: { telegramId: number }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TournamentData | null>(null)
  const [champion, setChampion] = useState('')
  const [runnerUp, setRunnerUp] = useState('')
  const [semi1, setSemi1] = useState('')
  const [semi2, setSemi2] = useState('')
  const [topScorer, setTopScorer] = useState('')
  const [bestPlayer, setBestPlayer] = useState('')
  const [bestYoung, setBestYoung] = useState('')
  const [saving, setSaving] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch<TournamentData>('/api/admin/tournament-results', telegramId, { method: 'GET' })
      setData(res)
      if (res.results) {
        const r = res.results
        setChampion(r.champion_code ?? '')
        setRunnerUp(r.runner_up_code ?? '')
        setTopScorer(r.top_scorer_name ?? '')
        setBestPlayer(r.best_player_name ?? '')
        setBestYoung(r.best_young_player_name ?? '')
        if (r.semifinalists) {
          try {
            const semis = JSON.parse(r.semifinalists) as string[]
            const others = semis.filter((c) => c !== r.champion_code && c !== r.runner_up_code)
            setSemi1(others[0] ?? '')
            setSemi2(others[1] ?? '')
          } catch {}
        }
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao carregar', 'error')
    } finally {
      setLoading(false)
    }
  }, [telegramId, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  function buildBody(): Record<string, unknown> {
    const body: Record<string, unknown> = {}
    if (champion) body.champion_code = champion
    if (runnerUp) body.runner_up_code = runnerUp
    if (champion && runnerUp && semi1 && semi2) {
      body.semifinalists = [champion, runnerUp, semi1, semi2]
    }
    if (topScorer.trim()) body.top_scorer_name = topScorer.trim()
    if (bestPlayer.trim()) body.best_player_name = bestPlayer.trim()
    if (bestYoung.trim()) body.best_young_player_name = bestYoung.trim()
    return body
  }

  async function saveResults(): Promise<boolean> {
    setSaving(true)
    try {
      await adminFetch('/api/admin/tournament-results', telegramId, {
        method: 'POST',
        body: JSON.stringify(buildBody()),
      })
      toast('Resultados salvos')
      return true
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function doSave() {
    const ok = await saveResults()
    if (ok) await loadData()
  }

  async function doSaveAndRecalculate() {
    if (!confirm('Salvar resultados e recalcular palpites de torneio? Esta ação pode demorar.')) return
    const ok = await saveResults()
    if (!ok) return
    setRecalculating(true)
    try {
      const res = await adminFetch<{ tournament_updated: number }>(
        '/api/admin/recalculate',
        telegramId,
        { method: 'POST', body: JSON.stringify({}), confirm: true }
      )
      toast(`Recalculado: ${res.tournament_updated ?? 0} palpites de torneio`)
      await loadData()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao recalcular', 'error')
    } finally {
      setRecalculating(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  const busy = saving || recalculating
  const counts = data?.prediction_counts ?? {
    top_scorer: [],
    best_player: [],
    best_young_player: [],
  }

  const topScorerTotal = counts.top_scorer.reduce((s, g) => s + g.count, 0)
  const bestPlayerTotal = counts.best_player.reduce((s, g) => s + g.count, 0)
  const bestYoungTotal = counts.best_young_player.reduce((s, g) => s + g.count, 0)

  const teamsDistinct = new Set([champion, runnerUp, semi1, semi2].filter(Boolean)).size
  const hasDuplicateTeams = champion && runnerUp && semi1 && semi2 && teamsDistinct < 4

  return (
    <div className="space-y-4">
      {/* Times */}
      <div className="bg-(--color-bg-surface) rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wider">Times</p>

        <div>
          <label className="text-xs text-(--color-text-secondary) block mb-1">Campeão</label>
          <select
            value={champion}
            onChange={(e) => setChampion(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-(--color-bg-base) text-(--color-text-primary) border border-(--color-border-base)"
          >
            <option value="">—</option>
            {allTeams.map((t) => (
              <option key={t.tla} value={t.tla}>{t.flag} {t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-(--color-text-secondary) block mb-1">Vice-campeão</label>
          <select
            value={runnerUp}
            onChange={(e) => setRunnerUp(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-(--color-bg-base) text-(--color-text-primary) border border-(--color-border-base)"
          >
            <option value="">—</option>
            {allTeams.map((t) => (
              <option key={t.tla} value={t.tla}>{t.flag} {t.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-(--color-text-secondary) block mb-1">Semifinalista 1</label>
            <select
              value={semi1}
              onChange={(e) => setSemi1(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-(--color-bg-base) text-(--color-text-primary) border border-(--color-border-base)"
            >
              <option value="">—</option>
              {allTeams.map((t) => (
                <option key={t.tla} value={t.tla}>{t.flag} {t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-(--color-text-secondary) block mb-1">Semifinalista 2</label>
            <select
              value={semi2}
              onChange={(e) => setSemi2(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-(--color-bg-base) text-(--color-text-primary) border border-(--color-border-base)"
            >
              <option value="">—</option>
              {allTeams.map((t) => (
                <option key={t.tla} value={t.tla}>{t.flag} {t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {hasDuplicateTeams && (
          <p className="text-xs text-(--color-accent-critical)">Os quatro times devem ser distintos</p>
        )}
      </div>

      {/* Prêmios individuais */}
      <div className="bg-(--color-bg-surface) rounded-xl p-4 space-y-5">
        <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wider">Prêmios individuais</p>

        <PlayerField
          label="Artilheiro (+50 pts)"
          value={topScorer}
          onChange={setTopScorer}
          groups={counts.top_scorer}
          total={topScorerTotal}
        />
        <PlayerField
          label="Melhor jogador (+50 pts)"
          value={bestPlayer}
          onChange={setBestPlayer}
          groups={counts.best_player}
          total={bestPlayerTotal}
        />
        <PlayerField
          label="Melhor jovem (+25 pts)"
          value={bestYoung}
          onChange={setBestYoung}
          groups={counts.best_young_player}
          total={bestYoungTotal}
        />
      </div>

      {/* Ações */}
      <div className="space-y-2">
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          disabled={busy}
          loading={saving}
          onClick={doSave}
        >
          Salvar resultados
        </Button>
        <Button
          variant="confirm"
          size="lg"
          className="w-full"
          disabled={busy}
          loading={recalculating}
          onClick={doSaveAndRecalculate}
        >
          Salvar e recalcular
        </Button>
      </div>
    </div>
  )
}

function PlayerField({
  label,
  value,
  onChange,
  groups,
  total,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  groups: PredictionGroup[]
  total: number
}) {
  const matchCount = countMatching(groups, value)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-(--color-text-secondary)">{label}</label>
        {value.trim() && total > 0 && (
          <span className="text-xs text-(--color-text-secondary)">
            {matchCount}/{total} acertam
          </span>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nome|alias1|alias2"
        className="w-full px-3 py-2 rounded-lg bg-(--color-bg-base) text-(--color-text-primary) border border-(--color-border-base) text-sm"
      />
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {groups.map((g) => (
            <button
              key={g.normalized}
              type="button"
              onClick={() => onChange(appendAlias(value, g.sample))}
              className="text-xs px-2.5 py-1 rounded-full bg-(--color-bg-base) border border-(--color-border-base) text-(--color-text-secondary) hover:border-(--color-accent-primary) hover:text-(--color-accent-primary) transition-colors"
            >
              {g.sample} <span className="font-semibold">{g.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
