export type NotificationType =
  | 'morning_digest'
  | 'evening_summary'
  | 'pre_match_top'
  | 'pre_match_dm'
  | 'post_match_top'
  | 'phase_open'
  | 'reconciliation_alert'
  | 'welcome_group'
  | 'weekly_recap'
  | 'bracket_defined'
  | 'predictions_revealed'
  | 'stale_match_alert'
  | 'stale_unscored_alert'
  | 'phase_champion'
  | 'penalty_check'
  | 'missing_qualifier_alert'
  | 'lock_review'
  | 'tournament_required_alert'
  | 'knockout_draw_pending_alert'

export type SendOptions = {
  type: NotificationType
  key: string
  chatId: number | string
  text: string
  matchId?: number
  payload?: Record<string, unknown>
  parseMode?: 'HTML' | 'MarkdownV2'
}

export type SendResult =
  | { sent: true }
  | { sent: false; reason: string }
