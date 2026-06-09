import { Badge } from '@/components/ui/badge'
import { getTeamDisplay } from '@/lib/teams'

export type RecentResult = {
  id: number
  home_team_code: string
  home_team_name: string
  away_team_code: string
  away_team_name: string
  home_score: number | null
  away_score: number | null
  kickoff_at: string | Date | number
  status: string
  user_prediction: {
    home_score: number
    away_score: number
    points_awarded: number
  } | null
}

export function RecentResultRow({ match }: { match: RecentResult }) {
  const home = getTeamDisplay(match.home_team_code)
  const away = getTeamDisplay(match.away_team_code)

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-(--color-text-primary)">
          {home.flag} {home.name}{' '}
          <span className="font-[family-name:var(--font-tight)] font-black">
            {match.home_score ?? '?'}×{match.away_score ?? '?'}
          </span>{' '}
          {away.name} {away.flag}
        </p>
        <p className="text-xs mt-0.5">
          {match.user_prediction ? (
            <>
              <span className="text-(--color-text-secondary)">
                Seu palpite: {match.user_prediction.home_score}×{match.user_prediction.away_score} ·{' '}
              </span>
              {match.user_prediction.points_awarded > 0 ? (
                <span className="font-semibold text-(--color-status-success)">
                  +{match.user_prediction.points_awarded} pts
                </span>
              ) : (
                <span className="font-semibold text-(--color-status-danger)">0 pts</span>
              )}
            </>
          ) : (
            <span className="text-(--color-text-secondary) italic">Sem palpite</span>
          )}
        </p>
      </div>
      <Badge variant="neutral">Finalizado</Badge>
    </div>
  )
}
