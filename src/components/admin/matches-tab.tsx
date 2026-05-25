'use client'

import { useState } from 'react'
import { adminFetch } from '@/lib/api/admin'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { getTeamDisplay } from '@/lib/teams'
import { useRegisterOverlay } from '@/hooks/use-register-overlay'
import { formatKickoff } from '@/lib/format'
import type { Match } from '@/lib/db/schema'

type Props = {
  matches: Match[]
  telegramId: number
  onRefresh: () => void
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Grupos',
  r32: 'Oitavas',
  r16: 'Oitavas',
  qf: 'Quartas',
  sf: 'Semis',
  '3rd': '3º Lugar',
  final: 'Final',
}


type OverrideModal = { match: Match } | null

export function MatchesTab({ matches, telegramId, onRefresh }: Props) {
  const { toast } = useToast()
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [overrideModal, setOverrideModal] = useState<OverrideModal>(null)
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [qtc, setQtc] = useState<'home' | 'away' | ''>('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  useRegisterOverlay(!!overrideModal)

  const stages = [...new Set(matches.map((m) => m.stage))]
  const statuses = [...new Set(matches.map((m) => m.status))]

  const filtered = matches.filter((m) => {
    if (stageFilter !== 'all' && m.stage !== stageFilter) return false
    if (statusFilter !== 'all' && m.status !== statusFilter) return false
    return true
  })

  async function doOverride(match: Match) {
    if (!reason.trim()) return toast('Motivo obrigatório', 'error')
    const hs = Number(homeScore)
    const as_ = Number(awayScore)
    if (isNaN(hs) || isNaN(as_)) return toast('Placar inválido', 'error')
    const isKnockout = match.stage !== 'group'
    if (isKnockout && hs === as_ && !qtc) return toast('Mata-mata com empate requer classificado', 'error')

    setLoading(true)
    try {
      await adminFetch(`/api/admin/matches/${match.id}/override`, telegramId, {
        method: 'POST',
        body: JSON.stringify({
          home_score: hs,
          away_score: as_,
          ...(qtc ? { qualified_team_code: qtc } : {}),
          reason,
        }),
        confirm: true,
      })
      toast('Resultado forçado e pontuação recalculada')
      setOverrideModal(null)
      setHomeScore('')
      setAwayScore('')
      setQtc('')
      setReason('')
      onRefresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function doCancel(match: Match) {
    const r = prompt(`Motivo do W.O. para ${getTeamDisplay(match.home_team_code).name} x ${getTeamDisplay(match.away_team_code).name}:`)
    if (!r) return
    if (!confirm('Confirmar W.O.? Esta ação aplica pontuação média para todos os palpites.')) return

    setLoading(true)
    try {
      const res = await adminFetch<{ predictions_updated: number }>(`/api/admin/matches/${match.id}/cancel`, telegramId, {
        method: 'POST',
        body: JSON.stringify({ reason: r }),
        confirm: true,
      })
      toast(`W.O. aplicado. ${res.predictions_updated} palpites atualizados.`)
      onRefresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function doRecalculate(match: Match) {
    setLoading(true)
    try {
      await adminFetch(`/api/admin/recalculate`, telegramId, {
        method: 'POST',
        body: JSON.stringify({ match_id: match.id }),
        confirm: true,
      })
      toast('Recalculado')
      onRefresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="text-xs px-2 py-1 rounded bg-(--color-bg-surface) text-(--color-text-primary) border border-(--color-border-base)"
        >
          <option value="all">Todos os stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>{STAGE_LABELS[s] ?? s}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-2 py-1 rounded bg-(--color-bg-surface) text-(--color-text-primary) border border-(--color-border-base)"
        >
          <option value="all">Todos os status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-xs text-(--color-text-secondary) self-center">{filtered.length} jogos</span>
      </div>

      <div className="space-y-2">
        {filtered.map((m) => {
          const home = getTeamDisplay(m.home_team_code)
          const away = getTeamDisplay(m.away_team_code)
          const isOverridden = m.override_by_admin

          return (
            <div
              key={m.id}
              className="bg-(--color-bg-surface) rounded-xl px-4 py-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-(--color-text-primary)">
                  {home.flag} {home.name} vs {away.name} {away.flag}
                </span>
                {isOverridden && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-(--color-accent-critical)/20 text-(--color-accent-critical) shrink-0">
                    Admin
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-(--color-text-secondary)">
                <span>{formatKickoff(m.kickoff_at)}</span>
                <span>·</span>
                <span>{STAGE_LABELS[m.stage] ?? m.stage}</span>
                <span>·</span>
                <span>{m.status}</span>
                {m.home_score !== null && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-(--color-text-primary)">
                      {m.home_score}×{m.away_score}
                    </span>
                  </>
                )}
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {m.status !== 'cancelled' && (
                  <Button variant="secondary" size="sm" disabled={loading} onClick={() => setOverrideModal({ match: m })}>
                    Forçar resultado
                  </Button>
                )}
                {m.status !== 'cancelled' && m.status !== 'finished' && (
                  <Button variant="danger" size="sm" disabled={loading} onClick={() => doCancel(m)}>
                    W.O.
                  </Button>
                )}
                {m.status === 'finished' && (
                  <Button variant="ghost" size="sm" disabled={loading} onClick={() => doRecalculate(m)}>
                    Recalcular
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal de override */}
      {overrideModal && (
        <div className="fixed inset-0 z-modal-backdrop flex items-end justify-center bg-black/60" onClick={() => setOverrideModal(null)}>
          <div
            className="bg-(--color-bg-base) rounded-t-2xl w-full max-w-lg p-6 space-y-4"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-[family-name:var(--font-tight)] font-black text-lg uppercase">
              Forçar resultado
            </h2>
            <p className="text-sm text-(--color-text-secondary)">
              {getTeamDisplay(overrideModal.match.home_team_code).name} vs {getTeamDisplay(overrideModal.match.away_team_code).name}
            </p>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={30}
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                placeholder="Casa"
                className="w-20 px-3 py-2 rounded-lg bg-(--color-bg-surface) text-(--color-text-primary) text-center"
              />
              <span className="text-(--color-text-secondary)">×</span>
              <input
                type="number"
                min={0}
                max={30}
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                placeholder="Fora"
                className="w-20 px-3 py-2 rounded-lg bg-(--color-bg-surface) text-(--color-text-primary) text-center"
              />
            </div>

            {overrideModal.match.stage !== 'group' && Number(homeScore) === Number(awayScore) && (
              <div>
                <p className="text-xs text-(--color-text-secondary) mb-1">Classificado:</p>
                <div className="flex gap-2">
                  {(['home', 'away'] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setQtc(side)}
                      className={`text-sm px-3 py-1.5 rounded-lg ${qtc === side ? 'bg-(--color-accent-primary) text-white' : 'bg-(--color-bg-surface) text-(--color-text-primary)'}`}
                    >
                      {side === 'home' ? getTeamDisplay(overrideModal.match.home_team_code).name : getTeamDisplay(overrideModal.match.away_team_code).name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo (obrigatório)"
              className="w-full px-3 py-2 rounded-lg bg-(--color-bg-surface) text-(--color-text-primary)"
            />

            <div className="flex gap-2">
              <Button variant="secondary" size="md" className="flex-1" onClick={() => setOverrideModal(null)}>
                Cancelar
              </Button>
              <Button variant="confirm" size="md" className="flex-1" disabled={loading} onClick={() => doOverride(overrideModal.match)}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
