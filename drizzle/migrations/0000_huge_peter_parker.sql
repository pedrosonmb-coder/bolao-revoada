CREATE TABLE `bot_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`sent_to` text NOT NULL,
	`match_id` integer,
	`payload` text,
	`sent_at` integer DEFAULT (unixepoch()) NOT NULL,
	`telegram_message_id` integer,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bot_messages_type_idx` ON `bot_messages` (`type`);--> statement-breakpoint
CREATE INDEX `bot_messages_sent_at_idx` ON `bot_messages` (`sent_at`);--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fifa_id` text,
	`fd_id` integer,
	`stage` text NOT NULL,
	`group_name` text,
	`match_number` integer,
	`home_team_code` text NOT NULL,
	`home_team_name` text NOT NULL,
	`away_team_code` text NOT NULL,
	`away_team_name` text NOT NULL,
	`kickoff_at` integer NOT NULL,
	`venue` text,
	`city` text,
	`country` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`home_score` integer,
	`away_score` integer,
	`home_score_pen` integer,
	`away_score_pen` integer,
	`winner_code` text,
	`qualified_team_code` text,
	`result_locked_at` integer,
	`predictions_close_at` integer NOT NULL,
	`fifa_payload` text,
	`fd_payload` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `matches_fifa_id_unique` ON `matches` (`fifa_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `matches_fd_id_unique` ON `matches` (`fd_id`);--> statement-breakpoint
CREATE INDEX `matches_kickoff_idx` ON `matches` (`kickoff_at`);--> statement-breakpoint
CREATE INDEX `matches_status_idx` ON `matches` (`status`);--> statement-breakpoint
CREATE INDEX `matches_stage_idx` ON `matches` (`stage`);--> statement-breakpoint
CREATE TABLE `phase_windows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stage` text NOT NULL,
	`opens_at` integer NOT NULL,
	`closes_at` integer NOT NULL,
	`multiplier` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phase_windows_stage_unique` ON `phase_windows` (`stage`);--> statement-breakpoint
CREATE TABLE `prediction_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`match_id` integer NOT NULL,
	`home_score` integer,
	`away_score` integer,
	`qualified_team_code` text,
	`changed_at` integer DEFAULT (unixepoch()) NOT NULL,
	`source` text DEFAULT 'user' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pred_history_user_id_idx` ON `prediction_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `pred_history_match_id_idx` ON `prediction_history` (`match_id`);--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`match_id` integer NOT NULL,
	`home_score` integer NOT NULL,
	`away_score` integer NOT NULL,
	`qualified_team_code` text,
	`points_awarded` integer DEFAULT 0 NOT NULL,
	`base_points` integer DEFAULT 0 NOT NULL,
	`classification_bonus` integer DEFAULT 0 NOT NULL,
	`multiplier` real DEFAULT 1 NOT NULL,
	`computed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `predictions_user_match_unique` ON `predictions` (`user_id`,`match_id`);--> statement-breakpoint
CREATE INDEX `predictions_user_id_idx` ON `predictions` (`user_id`);--> statement-breakpoint
CREATE INDEX `predictions_match_id_idx` ON `predictions` (`match_id`);--> statement-breakpoint
CREATE TABLE `tournament_predictions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`champion_code` text,
	`runner_up_code` text,
	`semifinalist_1_code` text,
	`semifinalist_2_code` text,
	`semifinalist_3_code` text,
	`semifinalist_4_code` text,
	`top_scorer_name` text,
	`best_player_name` text,
	`best_young_player_name` text,
	`points_awarded` integer DEFAULT 0 NOT NULL,
	`computed_at` integer,
	`closed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_predictions_user_id_unique` ON `tournament_predictions` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_pred_user_id_idx` ON `tournament_predictions` (`user_id`);--> statement-breakpoint
CREATE TABLE `tournament_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`champion_code` text,
	`runner_up_code` text,
	`semifinalists` text,
	`top_scorer_name` text,
	`best_player_name` text,
	`best_young_player_name` text,
	`finalized_at` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`telegram_id` integer NOT NULL,
	`telegram_username` text,
	`first_name` text NOT NULL,
	`last_name` text,
	`photo_url` text,
	`is_admin` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`paid_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_telegram_id_unique` ON `users` (`telegram_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_telegram_id_idx` ON `users` (`telegram_id`);