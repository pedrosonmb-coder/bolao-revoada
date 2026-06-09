import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { getTeamDisplay } from '@/lib/teams'
import { formatKickoff } from '@/lib/format'
import { getMatchPredictionState } from '@/lib/match-state'

export type UpcomingMatch = {
  id: number
  home_team_code: string
  home_team_name: string
  away_team_code: string
  away_team_name: string
  kickoff_at: string | Date | number
  status: string
  window_open: boolean
  user_prediction: { home_score: number; away_score: number } | null
}

export function UpcomingMatchRow({ match }: { match: UpcomingMatch }) {
  const state = getMatchPredictionState(match)
  const home = getTeamDisplay(match.home_team_code)
  const away = getTeamDisplay(match.away_team_code)
  const isClickable = state === 'no_prediction_open' || state === 'predicted_open'
  const isDead = state === 'no_prediction_locked'

  const inner = (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${isClickable ? 'cursor-pointer hover:bg-(--color-bg-base)' : 'cursor-default'} ${isDead ? 'opacity-60' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-(--color-text-primary) truncate">
          {home.flag} {home.name} <span className="text-(--color-text-secondary)">vs</span> {away.name} {away.flag}
        </p>
        <p className="text-xs text-(--color-text-secondary) mt-0.5">
          {formatKickoff(match.kickoff_at)}
          {match.user_prediction && (
            <> · Seu palpite: <span className="font-[family-name:var(--font-tight)] font-bold text-(--color-text-primary)">{match.user_prediction.home_score}×{match.user_prediction.away_score}</span></>
          )}
        </p>
      </div>
      {state === 'no_prediction_open' && <Badge variant="warning">Sem palpite</Badge>}
      {state === 'predicted_open' && <Badge variant="success">Palpitado</Badge>}
      {state === 'predicted_locked' && <Badge variant="neutral">Travado</Badge>}
      {state === 'no_prediction_locked' && <Badge variant="danger">Perdeu o palpite</Badge>}
    </div>
  )

  if (isClickable) {
    return (
      <Link href="/palpitar" className="block">
        {inner}
      </Link>
    )
  }
  return inner
}
