-- B-HKN-25: a hackathon's mentors, invited by a link as its judges are, each with a short line on
-- what they help with and optional office hours. A closed account takes its places with it.
CREATE TABLE `hackathon_mentors` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text,
	`status` text DEFAULT 'invited' NOT NULL,
	`token_hash` text NOT NULL,
	`invited_by` text NOT NULL,
	`helps_with` text,
	`office_hours` text,
	`responded_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hackathons`(`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hackathon_mentors_accepted_check" CHECK("hackathon_mentors"."status" != 'accepted' OR ("hackathon_mentors"."user_id" IS NOT NULL AND "hackathon_mentors"."helps_with" IS NOT NULL)),
	CONSTRAINT "hackathon_mentors_helps_with_check" CHECK("hackathon_mentors"."helps_with" IS NULL OR length("hackathon_mentors"."helps_with") <= 160),
	CONSTRAINT "hackathon_mentors_office_hours_check" CHECK("hackathon_mentors"."office_hours" IS NULL OR length("hackathon_mentors"."office_hours") <= 300)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_mentors_token_hash_unique` ON `hackathon_mentors` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_mentors_user_unique` ON `hackathon_mentors` (`event_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `hackathon_mentors_user_index` ON `hackathon_mentors` (`user_id`);