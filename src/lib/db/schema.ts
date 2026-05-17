import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    telegram_id: integer('telegram_id').notNull().unique(),
    telegram_username: text('telegram_username'),
    first_name: text('first_name').notNull(),
    last_name: text('last_name'),
    photo_url: text('photo_url'),
    is_admin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
    is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    paid_at: integer('paid_at', { mode: 'timestamp' }),
    created_at: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updated_at: integer('updated_at', { mode: 'timestamp' }),
  },
  (table) => ({
    telegramIdIdx: uniqueIndex('users_telegram_id_idx').on(table.telegram_id),
  })
)

// ---------------------------------------------------------------------------
// matches
// ---------------------------------------------------------------------------
export const matches = sqliteTable(
  'matches',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fifa_id: text('fifa_id').unique(),
    fd_id: integer('fd_id').unique(),
    // 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final'
    stage: text('stage').notNull(),
    group_name: text('group_name'),
    match_number: integer('match_number'),
    home_team_code: text('home_team_code').notNull(),
    home_team_name: text('home_team_name').notNull(),
    away_team_code: text('away_team_code').notNull(),
    away_team_name: text('away_team_name').notNull(),
    kickoff_at: integer('kickoff_at', { mode: 'timestamp' }).notNull(),
    venue: text('venue'),
    city: text('city'),
    // 'USA' | 'MEX' | 'CAN'
    country: text('country'),
    // 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled'
    status: text('status').notNull().default('scheduled'),
    home_score: integer('home_score'),
    away_score: integer('away_score'),
    home_score_pen: integer('home_score_pen'),
    away_score_pen: integer('away_score_pen'),
    // 'home' | 'away' | 'draw'
    winner_code: text('winner_code'),
    qualified_team_code: text('qualified_team_code'),
    result_locked_at: integer('result_locked_at', { mode: 'timestamp' }),
    predictions_close_at: integer('predictions_close_at', { mode: 'timestamp' }).notNull(),
    fifa_payload: text('fifa_payload'),
    fd_payload: text('fd_payload'),
  },
  (table) => ({
    kickoffIdx: index('matches_kickoff_idx').on(table.kickoff_at),
    statusIdx: index('matches_status_idx').on(table.status),
    stageIdx: index('matches_stage_idx').on(table.stage),
  })
)

// ---------------------------------------------------------------------------
// predictions
// ---------------------------------------------------------------------------
export const predictions = sqliteTable(
  'predictions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id),
    match_id: integer('match_id')
      .notNull()
      .references(() => matches.id),
    home_score: integer('home_score').notNull(),
    away_score: integer('away_score').notNull(),
    // 'home' | 'away' — só relevante no mata-mata se empate no placar palpitado
    qualified_team_code: text('qualified_team_code'),
    points_awarded: integer('points_awarded').notNull().default(0),
    base_points: integer('base_points').notNull().default(0),
    classification_bonus: integer('classification_bonus').notNull().default(0),
    multiplier: real('multiplier').notNull().default(1.0),
    computed_at: integer('computed_at', { mode: 'timestamp' }),
    created_at: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updated_at: integer('updated_at', { mode: 'timestamp' }),
  },
  (table) => ({
    userMatchUnique: uniqueIndex('predictions_user_match_unique').on(
      table.user_id,
      table.match_id
    ),
    userIdIdx: index('predictions_user_id_idx').on(table.user_id),
    matchIdIdx: index('predictions_match_id_idx').on(table.match_id),
  })
)

// ---------------------------------------------------------------------------
// prediction_history (auditoria — toda mudança de palpite fica registrada)
// ---------------------------------------------------------------------------
export const predictionHistory = sqliteTable(
  'prediction_history',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id),
    match_id: integer('match_id')
      .notNull()
      .references(() => matches.id),
    home_score: integer('home_score'),
    away_score: integer('away_score'),
    qualified_team_code: text('qualified_team_code'),
    changed_at: integer('changed_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    // 'user' | 'admin' | 'system'
    source: text('source').notNull().default('user'),
  },
  (table) => ({
    userIdIdx: index('pred_history_user_id_idx').on(table.user_id),
    matchIdIdx: index('pred_history_match_id_idx').on(table.match_id),
  })
)

// ---------------------------------------------------------------------------
// tournament_predictions
// ---------------------------------------------------------------------------
export const tournamentPredictions = sqliteTable(
  'tournament_predictions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    user_id: integer('user_id')
      .notNull()
      .unique()
      .references(() => users.id),
    champion_code: text('champion_code'),
    runner_up_code: text('runner_up_code'),
    // Os outros 2 semifinalistas (sem ordem — campeão e vice já são semis implicitamente)
    semifinalist_1_code: text('semifinalist_1_code'),
    semifinalist_2_code: text('semifinalist_2_code'),
    top_scorer_name: text('top_scorer_name'),
    best_player_name: text('best_player_name'),
    best_young_player_name: text('best_young_player_name'),
    points_awarded: integer('points_awarded').notNull().default(0),
    computed_at: integer('computed_at', { mode: 'timestamp' }),
    closed_at: integer('closed_at', { mode: 'timestamp' }),
  },
  (table) => ({
    userIdIdx: uniqueIndex('tournament_pred_user_id_idx').on(table.user_id),
  })
)

// ---------------------------------------------------------------------------
// tournament_results (preenchido pelo admin após a final — sempre 1 linha)
// ---------------------------------------------------------------------------
export const tournamentResults = sqliteTable('tournament_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  champion_code: text('champion_code'),
  runner_up_code: text('runner_up_code'),
  // JSON array com 4 códigos de seleções
  semifinalists: text('semifinalists'),
  top_scorer_name: text('top_scorer_name'),
  best_player_name: text('best_player_name'),
  best_young_player_name: text('best_young_player_name'),
  finalized_at: integer('finalized_at', { mode: 'timestamp' }),
})

// ---------------------------------------------------------------------------
// phase_windows
// ---------------------------------------------------------------------------
export const phaseWindows = sqliteTable('phase_windows', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
  stage: text('stage').notNull().unique(),
  opens_at: integer('opens_at', { mode: 'timestamp' }).notNull(),
  closes_at: integer('closes_at', { mode: 'timestamp' }).notNull(),
  multiplier: real('multiplier').notNull(),
})

// ---------------------------------------------------------------------------
// bot_messages (rastreio de notificações enviadas)
// ---------------------------------------------------------------------------
export const botMessages = sqliteTable(
  'bot_messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    // 'morning_digest' | 'match_reminder' | 'recap' | 'pre_match' | 'post_match'
    type: text('type').notNull(),
    // 'group' ou telegram_id do usuário
    sent_to: text('sent_to').notNull(),
    match_id: integer('match_id').references(() => matches.id),
    payload: text('payload'),
    sent_at: integer('sent_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    telegram_message_id: integer('telegram_message_id'),
  },
  (table) => ({
    typeIdx: index('bot_messages_type_idx').on(table.type),
    sentAtIdx: index('bot_messages_sent_at_idx').on(table.sent_at),
  })
)

// ---------------------------------------------------------------------------
// match_snapshots (histórico de cada resposta de cada fonte externa)
// ---------------------------------------------------------------------------
export const matchSnapshots = sqliteTable(
  'match_snapshots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    match_id: integer('match_id')
      .notNull()
      .references(() => matches.id),
    // 'football-data' | 'fifa' | 'ge' | 'wikipedia'
    source: text('source').notNull(),
    status: text('status'),
    home_score: integer('home_score'),
    away_score: integer('away_score'),
    home_score_pen: integer('home_score_pen'),
    away_score_pen: integer('away_score_pen'),
    raw_payload: text('raw_payload'),
    fetched_at: integer('fetched_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    matchFetchedIdx: index('match_snapshots_match_fetched_idx').on(
      table.match_id,
      table.fetched_at
    ),
  })
)

// ---------------------------------------------------------------------------
// polling_logs (uma linha por execução de cron)
// ---------------------------------------------------------------------------
export const pollingLogs = sqliteTable('polling_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ran_at: integer('ran_at', { mode: 'timestamp' }).notNull(),
  // 'poll-live-matches' | 'poll-fixtures'
  endpoint: text('endpoint').notNull(),
  checked: integer('checked').default(0),
  updated: integer('updated').default(0),
  locked: integer('locked').default(0),
  conflicts: integer('conflicts').default(0),
  duration_ms: integer('duration_ms'),
  error: text('error'),
})

// ---------------------------------------------------------------------------
// Tipos inferidos para uso na aplicação
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Match = typeof matches.$inferSelect
export type NewMatch = typeof matches.$inferInsert
export type Prediction = typeof predictions.$inferSelect
export type NewPrediction = typeof predictions.$inferInsert
export type TournamentPrediction = typeof tournamentPredictions.$inferSelect
export type NewTournamentPrediction = typeof tournamentPredictions.$inferInsert
export type TournamentResult = typeof tournamentResults.$inferSelect
export type PhaseWindow = typeof phaseWindows.$inferSelect
export type BotMessage = typeof botMessages.$inferSelect
export type MatchSnapshot = typeof matchSnapshots.$inferSelect
export type NewMatchSnapshot = typeof matchSnapshots.$inferInsert
export type PollingLog = typeof pollingLogs.$inferSelect
export type NewPollingLog = typeof pollingLogs.$inferInsert
