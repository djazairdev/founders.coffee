-- B-TEAM-01: hackathon teams, their members, invite links and join requests. Teams first, since the
-- others reference them; the unique index on a team's id and hackathon is the parent key of the
-- composite keys that hold a member or request to a team of the same hackathon.
CREATE TABLE `hackathon_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`looking_for_members` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hackathons`(`event_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hackathon_teams_name_check" CHECK(length(trim("hackathon_teams"."name")) BETWEEN 1 AND 60),
	CONSTRAINT "hackathon_teams_description_check" CHECK("hackathon_teams"."description" IS NULL OR length("hackathon_teams"."description") <= 500)
);--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_teams_event_unique` ON `hackathon_teams` (`id`,`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_teams_name_unique` ON `hackathon_teams` (`event_id`,lower("name"));--> statement-breakpoint
CREATE INDEX `hackathon_teams_looking_index` ON `hackathon_teams` (`event_id`,`looking_for_members`);--> statement-breakpoint
CREATE TABLE `hackathon_team_members` (
	`team_id` text NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`is_captain` integer DEFAULT false NOT NULL,
	`joined_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`team_id`, `user_id`),
	FOREIGN KEY (`team_id`,`event_id`) REFERENCES `hackathon_teams`(`id`,`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`,`user_id`) REFERENCES `hackathon_registrations`(`event_id`,`user_id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_team_members_event_user_unique` ON `hackathon_team_members` (`event_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_team_members_captain_unique` ON `hackathon_team_members` (`team_id`) WHERE is_captain = 1;--> statement-breakpoint
CREATE TABLE `hackathon_team_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_by` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `hackathon_teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_team_invites_token_hash_unique` ON `hackathon_team_invites` (`token_hash`);--> statement-breakpoint
CREATE INDEX `hackathon_team_invites_team_index` ON `hackathon_team_invites` (`team_id`);--> statement-breakpoint
CREATE TABLE `hackathon_team_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`decided_at` integer,
	FOREIGN KEY (`team_id`,`event_id`) REFERENCES `hackathon_teams`(`id`,`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`,`user_id`) REFERENCES `hackathon_registrations`(`event_id`,`user_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hackathon_team_requests_decided_check" CHECK(("hackathon_team_requests"."status" = 'pending') = ("hackathon_team_requests"."decided_at" IS NULL))
);--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_team_requests_pending_unique` ON `hackathon_team_requests` (`team_id`,`user_id`) WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX `hackathon_team_requests_user_index` ON `hackathon_team_requests` (`event_id`,`user_id`);
