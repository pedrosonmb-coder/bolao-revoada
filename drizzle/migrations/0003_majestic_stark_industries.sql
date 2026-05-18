ALTER TABLE `matches` ADD `disagreement_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `bot_messages_unique_type_sent_to` ON `bot_messages` (`type`,`sent_to`);