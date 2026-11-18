CREATE TABLE `hackathon_submission_screenshots` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`event_id` text NOT NULL,
	`team_id` text NOT NULL,
	`object_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`width` integer,
	`height` integer,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_submission_screenshots_object_key_unique` ON `hackathon_submission_screenshots` (`object_key`);--> statement-breakpoint
CREATE INDEX `hackathon_submission_screenshots_entry_index` ON `hackathon_submission_screenshots` (`submission_id`,`status`);--> statement-breakpoint
CREATE INDEX `hackathon_submission_screenshots_expiry_index` ON `hackathon_submission_screenshots` (`status`,`expires_at`);