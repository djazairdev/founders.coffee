-- B-SAFE-01: members' reports about a hackathon's entries and teams, one per member and target,
-- with a reason from a fixed list. Kept 24 months after the decision; the reviewed index serves the
-- retention sweep.
CREATE TABLE `hackathon_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`market_code` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reporter_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hackathons`(`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`market_code`) REFERENCES `markets`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reporter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hackathon_reports_decision_check" CHECK(("hackathon_reports"."status" = 'open') = ("hackathon_reports"."reviewed_at" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_reports_target_reporter_unique` ON `hackathon_reports` (`target_type`,`target_id`,`reporter_id`);--> statement-breakpoint
CREATE INDEX `hackathon_reports_market_status_index` ON `hackathon_reports` (`market_code`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `hackathon_reports_reporter_index` ON `hackathon_reports` (`reporter_id`);--> statement-breakpoint
CREATE INDEX `hackathon_reports_reviewed_at_index` ON `hackathon_reports` (`reviewed_at`) WHERE reviewed_at IS NOT NULL;