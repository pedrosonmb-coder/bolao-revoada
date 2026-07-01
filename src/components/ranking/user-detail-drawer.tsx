'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useUserDetail } from '@/hooks/use-ranking'
import { useRegisterOverlay } from '@/hooks/use-register-overlay'
import { Skeleton } from '@/components/ui/skeleton'
import type { RankingEntry } from '@/lib/scoring/ranking'

const STAGE_LABEL: Record<string, string> = {
  group: 'Fase de grupos',
  r32: 'Oitavas',
  r16: 'Oitavas de final',
  qf: 'Quartas de final',
  sf: 'Semifinais',
  '3rd': '3º lugar',
  final: 'Final',
}

type Props = {
  userId: number | null
  entry: RankingEntry | null
  stages?: string[]
  mode?: 'tournament'
  onClose: () => void
}

export function UserDetailDrawer({ userId, entry, stages, mode, onClose }: Props) {
  const { data, isLoading } = useUserDetail(userId)
  const overlayRef = useRef<HTMLDivElement>(null)

  useRegisterOverlay(!!userId)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!userId) return null

  const isTorneio = mode === 'tournament'
  const isGeral = !stages && !isTorneio

  // Labels reflecting the active tab
  const posLabel = isGeral ? 'Posição' : isTorneio ? 'Pos. Torneio' : 'Posição na fase'
  const ptsLabel = isGeral ? 'Total' : isTorneio ? 'Pts Torneio' : 'Pts na fase'
  const exactLabel = isGeral ? 'Placares exatos' : 'Exatos na fase'
  const winnersLabel = isGeral ? 'Vencedores acertados' : 'Acertos na fase'

  // by_stage: filter to active stages, hidden entirely for Torneio
  const stageSet = stages ? new Set(stages) : null
  const filteredByStage = isTorneio
    ? []
    : stageSet
    ? (data?.by_stage ?? []).filter((s) => stageSet.has(s.stage))
    : (data?.by_stage ?? [])
  // Show section while loading (skeletons) or when there is data to display
  const showByStage = !isTorneio && (!data || filteredByStage.length > 0)

  // Header: entry available immediately, data as fallback
  const displayName = entry?.name ?? data?.user.name
  const displayPhoto = entry !== null ? entry.photo_url : data?.user.photo_url

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/40 z-modal-backdrop"
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-drawer bg-(--color-bg-base) rounded-t-2xl max-h-[80vh] overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header — immediate from entry */}
        <div className="flex items-center justify-between p-4 border-b border-(--color-border-base)">
          {!displayName ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <div className="flex items-center gap-3">
              {displayPhoto ? (
                <img
                  src={displayPhoto}
                  alt={displayName}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-(--color-bg-surface) flex items-center justify-center font-bold text-sm text-(--color-text-primary)">
                  {displayName[0]}
                </div>
              )}
              <span className="font-semibold text-(--color-text-primary)">
                {displayName}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main content */}
        {!entry && isLoading ? (
          // Fallback skeleton if entry is somehow unavailable during initial load
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Trio: position / points / context — immediate from entry */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-(--color-bg-surface) rounded-xl p-3 text-center">
                <p className="text-xs text-(--color-text-secondary) mb-1">{posLabel}</p>
                <p className="font-[family-name:var(--font-tight)] font-black text-xl text-(--color-text-primary)">
                  {entry != null ? `${entry.position}º` : '—'}
                </p>
              </div>
              <div className="bg-(--color-accent-primary) rounded-xl p-3 text-center">
                <p className="text-xs text-white/70 mb-1">{ptsLabel}</p>
                <p className="font-[family-name:var(--font-tight)] font-black text-xl text-white">
                  {entry?.total_points ?? '—'}
                </p>
              </div>
              {isGeral ? (
                // Geral: show tournament points from entry (immediate)
                <div className="bg-(--color-bg-surface) rounded-xl p-3 text-center">
                  <p className="text-xs text-(--color-text-secondary) mb-1">Torneio</p>
                  <p className="font-[family-name:var(--font-tight)] font-black text-xl text-(--color-text-primary)">
                    {entry?.tournament_points ?? '—'}
                  </p>
                </div>
              ) : (
                // Phase/Torneio tabs: show global position from getUserDetail
                <div className="bg-(--color-bg-surface) rounded-xl p-3 text-center">
                  <p className="text-xs text-(--color-text-secondary) mb-1">Pos. Geral</p>
                  <p className="font-[family-name:var(--font-tight)] font-black text-xl text-(--color-text-primary)">
                    {data ? `${data.totals.position}º` : isLoading ? '…' : '—'}
                  </p>
                </div>
              )}
            </div>

            {/* Achievements — immediate from entry, hidden for Torneio */}
            {!isTorneio && entry && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-(--color-bg-surface) rounded-xl p-3 text-center">
                  <p className="text-xs text-(--color-text-secondary) mb-1">{exactLabel}</p>
                  <p className="font-[family-name:var(--font-tight)] font-bold text-lg text-(--color-text-primary)">
                    {entry.exact_scores}
                  </p>
                </div>
                <div className="bg-(--color-bg-surface) rounded-xl p-3 text-center">
                  <p className="text-xs text-(--color-text-secondary) mb-1">{winnersLabel}</p>
                  <p className="font-[family-name:var(--font-tight)] font-bold text-lg text-(--color-text-primary)">
                    {entry.winners_correct}
                  </p>
                </div>
              </div>
            )}

            {/* by_stage — filtered for active tab, skeletons while loading */}
            {showByStage && (
              <div>
                <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide mb-2">
                  Por fase
                </p>
                <div className="bg-(--color-bg-surface) rounded-xl divide-y divide-(--color-border-base)">
                  {!data ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 rounded-none first:rounded-t-xl last:rounded-b-xl" />
                    ))
                  ) : (
                    filteredByStage.map((s) => (
                      <div key={s.stage} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-(--color-text-primary)">
                          {STAGE_LABEL[s.stage] ?? s.stage}
                        </span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-(--color-text-secondary)">{s.matches_played} jogos</span>
                          <span className="text-(--color-text-secondary)">
                            {Math.round(s.accuracy * 100)}% acerto
                          </span>
                          <span className="font-bold text-(--color-text-primary)">{s.points} pts</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Disciplina de palpite — shown when data is available and there are closed matches */}
            {data?.closed_matches && data.closed_matches.total > 0 && (
              <p
                className="text-xs text-center"
                style={{
                  color: data.closed_matches.missed === 0
                    ? 'var(--color-status-success)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {data.closed_matches.missed === 0
                  ? `Palpitou todos os ${data.closed_matches.total} jogos ✓`
                  : `Palpitou ${data.closed_matches.total - data.closed_matches.missed} de ${data.closed_matches.total} jogos`}
              </p>
            )}

            <Link
              href={`/ranking/${userId}`}
              className="flex items-center justify-center gap-1 text-sm font-semibold text-(--color-accent-primary) py-1"
              onClick={onClose}
            >
              Ver desempenho completo →
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
