ALTER TABLE `matches` ADD `override_by_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `previous_position` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `position_snapshot_at` integer;