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
