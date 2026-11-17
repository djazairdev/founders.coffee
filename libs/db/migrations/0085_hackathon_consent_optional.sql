PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__snapshot_hackathon_team_members` AS SELECT * FROM `hackathon_team_members`;--> statement-breakpoint
CREATE TABLE `__snapshot_hackathon_team_requests` AS SELECT * FROM `hackathon_team_requests`;--> statement-breakpoint
CREATE TABLE `__new_hackathon_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'registered' NOT NULL,
	`attendance_mode` text NOT NULL,
	`code_of_conduct_accepted_at` integer,
	`age_attested_at` integer,
	`looking_for_team` integer DEFAULT false NOT NULL,
	`skills` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hackathons`(`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hackathon_registrations_skills_check" CHECK("__new_hackathon_registrations"."skills" IS NULL OR length("__new_hackathon_registrations"."skills") <= 140)
);
--> statement-breakpoint
INSERT INTO `__new_hackathon_registrations`("id", "event_id", "user_id", "status", "attendance_mode", "code_of_conduct_accepted_at", "age_attested_at", "looking_for_team", "skills", "created_at", "updated_at") SELECT "id", "event_id", "user_id", "status", "attendance_mode", NULL, "age_attested_at", "looking_for_team", "skills", "created_at", "updated_at" FROM `hackathon_registrations`;--> statement-breakpoint
DROP TABLE `hackathon_registrations`;--> statement-breakpoint
ALTER TABLE `__new_hackathon_registrations` RENAME TO `hackathon_registrations`;--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_registrations_event_user_unique` ON `hackathon_registrations` (`event_id`,`user_id`);--> statement-breakpoint
INSERT INTO `hackathon_team_members` SELECT * FROM `__snapshot_hackathon_team_members`;--> statement-breakpoint
INSERT INTO `hackathon_team_requests` SELECT * FROM `__snapshot_hackathon_team_requests`;--> statement-breakpoint
DROP TABLE `__snapshot_hackathon_team_members`;--> statement-breakpoint
DROP TABLE `__snapshot_hackathon_team_requests`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `hackathon_registrations_event_status_index` ON `hackathon_registrations` (`event_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `hackathon_registrations_user_index` ON `hackathon_registrations` (`user_id`);--> statement-breakpoint
CREATE INDEX `hackathon_registrations_skills_index` ON `hackathon_registrations` (`event_id`) WHERE skills IS NOT NULL;
