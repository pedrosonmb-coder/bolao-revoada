CREATE TABLE `match_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`source` text NOT NULL,
	`status` text,
	`home_score` integer,
	`away_score` integer,
	`home_score_pen` integer,
	`away_score_pen` integer,
	`raw_payload` text,
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `match_snapshots_match_fetched_idx` ON `match_snapshots` (`match_id`,`fetched_at`);--> statement-breakpoint
CREATE TABLE `polling_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ran_at` integer NOT NULL,
	`endpoint` text NOT NULL,
	`checked` integer DEFAULT 0,
	`updated` integer DEFAULT 0,
	`locked` integer DEFAULT 0,
	`conflicts` integer DEFAULT 0,
	`duration_ms` integer,
	`error` text
);
