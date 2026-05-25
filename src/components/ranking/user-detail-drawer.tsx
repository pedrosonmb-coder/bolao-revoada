'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useUserDetail } from '@/hooks/use-ranking'
import { useRegisterOverlay } from '@/hooks/use-register-overlay'
import { Skeleton } from '@/components/ui/skeleton'

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
  onClose: () => void
}

export function UserDetailDrawer({ userId, onClose }: Props) {
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
        <div className="flex items-center justify-between p-4 border-b border-(--color-border-base)">
          {isLoading || !data ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <div className="flex items-center gap-3">
              {data.user.photo_url ? (
                <img
                  src={data.user.photo_url}
                  alt={data.user.first_name}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-(--color-bg-surface) flex items-center justify-center font-bold text-sm text-(--color-text-primary)">
                  {data.user.first_name[0]}
                </div>
              )}
              <span className="font-semibold text-(--color-text-primary)">
                {data.user.first_name} {data.user.last_name}
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

        {isLoading || !data ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-(--color-bg-surface) rounded-xl p-3 text-center">
                <p className="text-xs text-(--color-text-secondary) mb-1">Posição</p>
                <p className="font-[family-name:var(--font-tight)] font-black text-xl text-(--color-text-primary)">
                  {data.totals.position}º
                </p>
              </div>
              <div className="bg-(--color-accent-primary) rounded-xl p-3 text-center">
                <p className="text-xs text-white/70 mb-1">Total</p>
                <p className="font-[family-name:var(--font-tight)] font-black text-xl text-white">
                  {data.totals.total_points}
                </p>
              </div>
              <div className="bg-(--color-bg-surface) rounded-xl p-3 text-center">
                <p className="text-xs text-(--color-text-secondary) mb-1">Torneio</p>
                <p className="font-[family-name:var(--font-tight)] font-black text-xl text-(--color-text-primary)">
                  {data.totals.tournament_points}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-(--color-bg-surface) rounded-xl p-3 text-center">
                <p className="text-xs text-(--color-text-secondary) mb-1">Placares exatos</p>
                <p className="font-[family-name:var(--font-tight)] font-bold text-lg text-(--color-text-primary)">
                  {data.achievements.exact_scores}
                </p>
              </div>
              <div className="bg-(--color-bg-surface) rounded-xl p-3 text-center">
                <p className="text-xs text-(--color-text-secondary) mb-1">Vencedores acertados</p>
                <p className="font-[family-name:var(--font-tight)] font-bold text-lg text-(--color-text-primary)">
                  {data.achievements.winners_correct}
                </p>
              </div>
            </div>

            {data.by_stage.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide mb-2">
                  Por fase
                </p>
                <div className="bg-(--color-bg-surface) rounded-xl divide-y divide-(--color-border-base)">
                  {data.by_stage.map((s) => (
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
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
