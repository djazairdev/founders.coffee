-- B-REG-01: the registrations table, and the count of places they hold on `hackathons`.
-- drizzle-kit wrote the count as a rebuild of `hackathons`, which would drop the table and cascade to
-- its tracks, criteria and registrations; a column with its own check is added in place instead.
CREATE TABLE `hackathon_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'registered' NOT NULL,
	`attendance_mode` text NOT NULL,
	`code_of_conduct_accepted_at` integer NOT NULL,
	`age_attested_at` integer,
	`looking_for_team` integer DEFAULT false NOT NULL,
	`skills` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hackathons`(`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hackathon_registrations_skills_check" CHECK("hackathon_registrations"."skills" IS NULL OR length("hackathon_registrations"."skills") <= 140)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_registrations_event_user_unique` ON `hackathon_registrations` (`event_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `hackathon_registrations_event_status_index` ON `hackathon_registrations` (`event_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `hackathon_registrations_user_index` ON `hackathon_registrations` (`user_id`);--> statement-breakpoint
ALTER TABLE `hackathons` ADD `registered_count` integer DEFAULT 0 NOT NULL CONSTRAINT "hackathons_registered_count_check" CHECK("registered_count" >= 0);
