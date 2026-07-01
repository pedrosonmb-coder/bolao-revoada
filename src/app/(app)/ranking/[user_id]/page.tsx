'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useUserFull } from '@/hooks/use-ranking'
import { getTeamDisplay } from '@/lib/teams'
import { Skeleton } from '@/components/ui/skeleton'
import { pointsColor } from '@/lib/scoring/points-color'
import { toChartPoints, computeYRange, xLabelStep } from '@/lib/scoring/position-chart'
import { deriveBreakdown } from '@/lib/scoring/multipliers'
import type { Distribution, MatchResult } from '@/lib/scoring/full-ranking-helpers'
import type { MatchEntry, PositionPoint } from '@/hooks/use-ranking'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const

function MedalIcon({ position }: { position: number }) {
  const color = MEDAL_COLORS[position - 1]
  if (color) {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx="7" cy="7" r="7" fill={color} />
        <text x="7" y="10.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">
          {position}
        </text>
      </svg>
    )
  }
  return (
    <span className="font-[family-name:var(--font-tight)] font-black text-sm text-white leading-none tabular-nums">
      {position}
    </span>
  )
}

const DIST_COLORS: Record<keyof Distribution, string> = {
  exact:           '#0A2D82',
  score_diff:      '#16A34A',
  winner_goals_w:  '#65A30D',
  winner_goals_l:  '#CA8A04',
  winner_only:     '#EA580C',
  miss:            '#DC2626',
}

const DIST_LABELS: Record<keyof Distribution, string> = {
  exact:          'Placar exato',
  score_diff:     'Saldo certo',
  winner_goals_w: 'Gols vencedor',
  winner_goals_l: 'Gols perdedor',
  winner_only:    'Só vencedor',
  miss:           'Errou',
}

const DIST_KEYS: (keyof Distribution)[] = [
  'exact', 'score_diff', 'winner_goals_w', 'winner_goals_l', 'winner_only', 'miss',
]

function distTotal(d: Distribution) {
  return DIST_KEYS.reduce((s, k) => s + d[k], 0)
}

function getProfileLabel(d: Distribution): { label: string; desc: string } {
  const total = distTotal(d)
  if (total === 0) return { label: '—', desc: 'Nenhum palpite computado ainda' }
  const exactPct = d.exact / total
  const precisionPct = (d.exact + d.score_diff) / total
  const missPct = d.miss / total
  const boldPct = (d.winner_goals_l + d.winner_only) / total
  if (exactPct >= 0.30) return { label: 'Vidente', desc: 'Placa exata com frequência absurda' }
  if (precisionPct >= 0.40) return { label: 'Cirúrgico', desc: 'Erra pouco, sempre acerta o saldo' }
  if (missPct < 0.20) return { label: 'Consistente', desc: 'Raramente erra o vencedor' }
  if (boldPct >= 0.30) return { label: 'Apostador', desc: 'Vai de cabeça, às vezes paga caro' }
  return { label: 'Equilibrado', desc: 'Bem distribuído entre os acertos' }
}

function fmt(n: number, digits = 1) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SegmentedBar({ distribution }: { distribution: Distribution }) {
  const total = distTotal(distribution)
  const { label, desc } = getProfileLabel(distribution)

  return (
    <div>
      {total === 0 ? (
        <div className="h-4 rounded-full bg-(--color-bg-surface)" />
      ) : (
        <div className="flex h-4 rounded-full overflow-hidden">
          {DIST_KEYS.map((k) => {
            const pct = (distribution[k] / total) * 100
            if (pct === 0) return null
            return (
              <div
                key={k}
                style={{ width: `${pct}%`, backgroundColor: DIST_COLORS[k] }}
              />
            )
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
        {DIST_KEYS.map((k) => {
          const count = distribution[k]
          if (count === 0) return null
          return (
            <span key={k} className="flex items-center gap-1 text-xs text-(--color-text-secondary)">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: DIST_COLORS[k] }}
              />
              {count} {DIST_LABELS[k]}
            </span>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <span className="font-[family-name:var(--font-tight)] font-black text-lg text-(--color-text-primary)">
            {label}
          </span>
          <p className="text-xs text-(--color-text-secondary)">{desc}</p>
        </div>
        {total > 0 && (
          <span className="text-xs text-(--color-text-secondary)">
            {total} jogo{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

function MatchCard({ match }: { match: MatchResult & { isBest?: boolean } }) {
  const home = getTeamDisplay(match.home_team_code)
  const away = getTeamDisplay(match.away_team_code)
  const hasScore = match.home_score != null && match.away_score != null
  const hasPalpite = match.palpite_home != null && match.palpite_away != null
  return (
    <div className="bg-(--color-bg-surface) rounded-xl p-3">
      <p className="text-xs text-(--color-text-secondary) mb-2">
        {match.isBest ? 'Melhor acerto' : 'Maior tropeço'}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-(--color-text-primary)">
          {home.flag} {home.name}
        </span>
        <span className="text-xs text-(--color-text-secondary)">×</span>
        <span className="text-sm font-medium text-(--color-text-primary) text-right">
          {away.name} {away.flag}
        </span>
      </div>
      {hasScore && (
        <p className="text-xs text-(--color-text-secondary) text-center mt-1">
          {match.home_score}–{match.away_score}
          {hasPalpite && <> · palpitou {match.palpite_home}–{match.palpite_away}</>}
        </p>
      )}
      <p className="text-center mt-1.5">
        <span
          className="font-[family-name:var(--font-tight)] font-black text-xl"
          style={{ color: match.isBest ? 'var(--color-status-success)' : 'var(--color-status-danger)' }}
        >
          {match.points_awarded} pts
        </span>
      </p>
    </div>
  )
}


function fmtSnapshotDate(d: string): string {
  const [, month, day] = d.split('-')
  return `${day}/${month}`
}

function PositionChart({ history, totalParticipants }: { history: PositionPoint[]; totalParticipants: number }) {
  if (history.length < 2) return null

  const pts = toChartPoints(history, totalParticipants)
  const positions = history.map((p) => p.position)
  const { effectiveMin, effectiveMax } = computeYRange(positions, totalParticipants)
  const last = pts[pts.length - 1]
  const step = xLabelStep(pts.length)

  const polyline = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <svg
      viewBox="0 0 300 120"
      width="100%"
      style={{ display: 'block', overflow: 'visible' }}
      aria-label="Gráfico de evolução de posição no ranking"
    >
      {/* Grid lines */}
      <line x1="28" y1="14" x2="264" y2="14" stroke="var(--color-border-base)" strokeWidth="0.5" strokeDasharray="3 3" />
      <line x1="28" y1="96" x2="264" y2="96" stroke="var(--color-border-base)" strokeWidth="0.5" strokeDasharray="3 3" />

      {/* Y axis labels */}
      <text x="22" y="18" textAnchor="end" fontSize="9" fill="var(--color-text-secondary)">{effectiveMin}º</text>
      <text x="22" y="100" textAnchor="end" fontSize="9" fill="var(--color-text-secondary)">{effectiveMax}º</text>

      {/* X axis date labels */}
      {pts.map((p, i) => {
        const isLast = i === pts.length - 1
        if (i % step !== 0 && !isLast) return null
        return (
          <text
            key={p.date}
            x={p.x.toFixed(1)}
            y="116"
            textAnchor="middle"
            fontSize="8"
            fill="var(--color-text-secondary)"
          >
            {fmtSnapshotDate(p.date)}
          </text>
        )
      })}

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke="var(--color-accent-primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {pts.map((p) => (
        <circle
          key={p.date}
          cx={p.x.toFixed(1)}
          cy={p.y.toFixed(1)}
          r="3"
          fill="var(--color-accent-primary)"
        />
      ))}

      {/* Current position label */}
      <text
        x={(last.x + 7).toFixed(1)}
        y={(last.y + 4).toFixed(1)}
        fontSize="10"
        fontWeight="bold"
        fill="var(--color-accent-primary)"
      >
        {last.position}º
      </text>
    </svg>
  )
}

const STAGE_NAME: Record<string, string> = {
  group: 'Grupos',
  r32: 'Oitavas',
  r16: 'Oitavas de final',
  qf: 'Quartas',
  sf: 'Semifinais',
  '3rd': '3º lugar',
  final: 'Final',
}

function CampanhaRow({ m }: { m: MatchEntry }) {
  const [open, setOpen] = useState(false)
  const home = getTeamDisplay(m.home_team_code)
  const away = getTeamDisplay(m.away_team_code)
  const hasScore = m.home_score != null && m.away_score != null
  const hasPalpite = m.palpite_home != null
  const isScored = hasPalpite && m.points_awarded != null && m.base_points != null
  const color = hasPalpite ? pointsColor(m.base_points ?? 0) : 'var(--color-text-secondary)'

  // Breakdown derivado client-side: multiplier + bonus = points_awarded - Math.round(base × mult)
  let breakdownLine: string | null = null
  if (isScored) {
    const { multiplier, bonus } = deriveBreakdown(m.base_points!, m.stage, m.points_awarded!)
    const stageName = STAGE_NAME[m.stage] ?? m.stage
    breakdownLine = bonus > 0
      ? `${m.base_points} base × ${multiplier} (${stageName}) + ${bonus} (classificado) = ${m.points_awarded}`
      : `${m.base_points} base × ${multiplier} (${stageName}) = ${m.points_awarded}`
  }

  return (
    <div
      className="py-2.5 border-b border-(--color-border-base) last:border-0"
      onClick={() => { if (breakdownLine) setOpen((o) => !o) }}
      style={{ cursor: breakdownLine ? 'pointer' : 'default' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 text-center font-[family-name:var(--font-tight)] font-black text-base flex-shrink-0"
          style={{ color }}
        >
          {hasPalpite ? m.points_awarded : 0}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm text-(--color-text-primary) truncate">
              {home.flag} {home.name} × {away.name} {away.flag}
            </p>
            {m.override_by_admin && (
              <span className="text-xs text-(--color-text-secondary) shrink-0">✎ corrigido</span>
            )}
          </div>
          <p className="text-xs text-(--color-text-secondary) mt-0.5">
            {hasScore ? (
              <>
                <span className="font-medium">{m.home_score}–{m.away_score}</span>
                {hasPalpite ? (
                  <>{' · palpite '}<span>{m.palpite_home}–{m.palpite_away}</span></>
                ) : (
                  <>{' · '}<span className="italic">Não palpitado</span></>
                )}
              </>
            ) : (
              hasPalpite ? 'Aguardando resultado' : <span className="italic">Não palpitado</span>
            )}
          </p>
        </div>
      </div>
      {open && breakdownLine && (
        <p className="text-xs text-(--color-text-secondary) mt-1.5 ml-[52px] font-mono leading-tight">
          {breakdownLine}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UserPerformancePage() {
  const { user_id } = useParams<{ user_id: string }>()
  const router = useRouter()
  const { data, isLoading, error } = useUserFull(user_id)

  const goBack = () => router.push('/ranking')

  // ---------- loading ----------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-(--color-bg-base)">
        <div className="bg-(--color-accent-primary) px-4 pt-4 pb-8">
          <button onClick={goBack} className="flex items-center gap-1 text-white/70 text-sm">
            <ChevronLeft size={16} /> Ranking
          </button>
          <div className="mt-5 flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 bg-white/20" />
              <Skeleton className="h-3 w-20 bg-white/20" />
            </div>
          </div>
          <Skeleton className="h-12 w-24 mx-auto mt-6 bg-white/20" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-(--color-bg-base) flex flex-col">
        <div className="bg-(--color-accent-primary) px-4 pt-4 pb-6">
          <button onClick={goBack} className="flex items-center gap-1 text-white/70 text-sm">
            <ChevronLeft size={16} /> Ranking
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <p className="text-(--color-text-secondary)">Participante não encontrado.</p>
        </div>
      </div>
    )
  }

  const { user, totals, achievements, distribution, best_match, worst_match, group_comparison, matches, position_history, total_participants, closed_matches, badges } = data
  const total = distTotal(distribution)
  const accuracyPct = total > 0 ? Math.round((achievements.winners_correct / total) * 100) : 0
  const diff = group_comparison.user_avg_per_match - group_comparison.group_avg_per_match

  return (
    <div className="min-h-screen bg-(--color-bg-base)">
      {/* ---------------------------------------------------------------- HERO */}
      <div className="bg-(--color-accent-primary) text-white px-4 pt-4 pb-10">
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-white/70 text-sm mb-5 -ml-0.5"
        >
          <ChevronLeft size={16} /> Ranking
        </button>

        <div className="flex items-center gap-4">
          {user.photo_url ? (
            <img
              src={user.photo_url}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-white/30"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center font-[family-name:var(--font-tight)] font-black text-2xl text-white flex-shrink-0">
              {user.name[0]}
            </div>
          )}
          <div>
            <h1 className="font-[family-name:var(--font-tight)] font-black text-2xl leading-tight">
              {user.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <MedalIcon position={totals.position} />
              <span className="text-white/80 text-sm">{totals.position}º lugar</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-white/60 text-xs uppercase tracking-widest mb-0.5">Total de pontos</p>
          <p className="font-[family-name:var(--font-tight)] font-black text-6xl leading-none">
            {totals.total_points}
          </p>
          <p className="text-white/60 text-xs mt-2">
            {totals.match_points} de partidas · {totals.tournament_points} de torneio
          </p>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-3 pb-8">
        {/* ----------------------------------------------------- ATRIBUTOS */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-(--color-bg-surface) rounded-xl p-3 text-center">
            <p className="text-xs text-(--color-text-secondary) mb-1">Placares exatos</p>
            <p className="font-[family-name:var(--font-tight)] font-black text-xl text-(--color-text-primary)">
              {achievements.exact_scores}
            </p>
          </div>
          <div className="bg-(--color-bg-surface) rounded-xl p-3 text-center">
            <p className="text-xs text-(--color-text-secondary) mb-1">% acerto</p>
            <p className="font-[family-name:var(--font-tight)] font-black text-xl text-(--color-text-primary)">
              {accuracyPct}%
            </p>
          </div>
          <div className="bg-(--color-bg-surface) rounded-xl p-3 text-center">
            <p className="text-xs text-(--color-text-secondary) mb-1">Média/jogo</p>
            <p className="font-[family-name:var(--font-tight)] font-black text-xl text-(--color-text-primary)">
              {fmt(group_comparison.user_avg_per_match)}
            </p>
            <p
              className="text-xs mt-0.5 leading-tight"
              style={{ color: diff >= 0 ? 'var(--color-status-success)' : 'var(--color-status-danger)' }}
            >
              {diff >= 0 ? `+${fmt(diff)}` : fmt(diff)} vs grupo
            </p>
          </div>
        </div>

        {/* ----------------------------------- DISCIPLINA DE PALPITE */}
        {closed_matches.total > 0 && (
          <p
            className="text-xs px-1"
            style={{
              color: closed_matches.missed === 0
                ? 'var(--color-status-success)'
                : 'var(--color-text-secondary)',
            }}
          >
            {closed_matches.missed === 0
              ? `Palpitou todos os ${closed_matches.total} jogos ✓`
              : `Palpitou ${closed_matches.total - closed_matches.missed} de ${closed_matches.total} jogos fechados`}
          </p>
        )}

        {/* ------------------------------------------ PERFIL DE PALPITE */}
        <div className="bg-(--color-bg-surface) rounded-xl p-4">
          <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide mb-3">
            Perfil de palpite
          </p>
          <SegmentedBar distribution={distribution} />
        </div>

        {/* ----------------------------------------- EVOLUÇÃO NO RANKING */}
        {position_history.length >= 2 && (
          <div className="bg-(--color-bg-surface) rounded-xl p-4">
            <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide mb-3">
              Evolução no ranking
            </p>
            <PositionChart history={position_history} totalParticipants={total_participants} />
            <p className="text-xs text-(--color-text-secondary) mt-2 text-right">
              desde {fmtSnapshotDate(position_history[0].date)}
            </p>
          </div>
        )}

        {/* -------------------------------------------------- CONQUISTAS */}
        {badges.length > 0 && (
          <div className="bg-(--color-bg-surface) rounded-xl p-4">
            <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide mb-3">
              Conquistas
            </p>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-1.5 rounded-full border border-(--color-border-base) px-3 py-1.5"
                  style={{ background: 'rgba(255,215,0,0.10)', borderColor: 'rgba(255,215,0,0.35)' }}
                >
                  <span aria-hidden>🏆</span>
                  <span className="text-sm font-semibold" style={{ color: '#92700A' }}>
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ----------------------------------------------- MELHOR / PIOR */}
        {(best_match || worst_match) && (
          <div className="grid grid-cols-2 gap-3">
            {best_match && <MatchCard match={{ ...best_match, isBest: true }} />}
            {worst_match && <MatchCard match={{ ...worst_match, isBest: false }} />}
          </div>
        )}

        {/* ---------------------------------------------------- CAMPANHA */}
        {matches.length > 0 && (
          <div className="bg-(--color-bg-surface) rounded-xl px-3">
            <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide pt-3 pb-1 px-1">
              Campanha
            </p>
            {matches.map((m) => (
              <CampanhaRow key={m.match_id} m={m} />
            ))}
          </div>
        )}

        {matches.length === 0 && (
          <div className="bg-(--color-bg-surface) rounded-xl p-6 text-center">
            <p className="text-sm text-(--color-text-secondary)">
              Nenhum resultado computado ainda.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
