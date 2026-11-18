CREATE TABLE `hackathon_interest` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`market_code` text NOT NULL,
	`locale` text NOT NULL,
	`notified_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`market_code`) REFERENCES `markets`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_interest_email_market_unique` ON `hackathon_interest` (`email`,`market_code`);--> statement-breakpoint
CREATE INDEX `hackathon_interest_notified_index` ON `hackathon_interest` (`notified_at`) WHERE notified_at IS NOT NULL;