-- B-ANN-05: the registration notice owed to a market's hackathon interest list, one round per
-- market, and what each address's notice attempts left behind. The waiting index serves the claim.
CREATE TABLE `hackathon_interest_launches` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`market_code` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`completed_at` integer,
	`cancelled_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hackathons`(`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`market_code`) REFERENCES `markets`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_interest_launch_event_unique` ON `hackathon_interest_launches` (`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_interest_launch_market_unique` ON `hackathon_interest_launches` (`market_code`) WHERE status != 'cancelled';--> statement-breakpoint
CREATE INDEX `hackathon_interest_launch_pending_index` ON `hackathon_interest_launches` (`created_at`) WHERE status = 'pending';--> statement-breakpoint
ALTER TABLE `hackathon_interest` ADD `send_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `hackathon_interest` ADD `last_error` text;--> statement-breakpoint
CREATE INDEX `hackathon_interest_waiting_index` ON `hackathon_interest` (`market_code`,`created_at`) WHERE notified_at IS NULL;