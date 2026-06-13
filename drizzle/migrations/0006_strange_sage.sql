CREATE TABLE `ranking_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`position` integer NOT NULL,
	`total_points` integer NOT NULL,
	`snapshot_date` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ranking_snapshots_user_date_idx` ON `ranking_snapshots` (`user_id`,`snapshot_date`);--> statement-breakpoint
CREATE INDEX `ranking_snapshots_user_id_idx` ON `ranking_snapshots` (`user_id`);