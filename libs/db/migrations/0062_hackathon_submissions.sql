-- B-SUB-01: hackathon submissions, one per team, and a snapshot of each submit. Submissions first,
-- since the snapshots reference them; the track and the team are held to the submission's own
-- hackathon by composite keys.
CREATE TABLE `hackathon_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`team_id` text NOT NULL,
	`track_id` text,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`repository_url` text,
	`demo_video_url` text,
	`pull_request_urls` text DEFAULT '[]' NOT NULL,
	`ai_tools` text DEFAULT '[]' NOT NULL,
	`ai_statement` text,
	`original_work_attested_at` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`submitted_at` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hackathons`(`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`,`event_id`) REFERENCES `hackathon_teams`(`id`,`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`,`event_id`) REFERENCES `hackathon_tracks`(`id`,`event_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hackathon_submissions_title_check" CHECK(length(trim("hackathon_submissions"."title")) BETWEEN 1 AND 100),
	CONSTRAINT "hackathon_submissions_description_check" CHECK(length("hackathon_submissions"."description") <= 2000),
	CONSTRAINT "hackathon_submissions_urls_check" CHECK(("hackathon_submissions"."repository_url" IS NULL OR length("hackathon_submissions"."repository_url") <= 2048) AND ("hackathon_submissions"."demo_video_url" IS NULL OR length("hackathon_submissions"."demo_video_url") <= 2048)),
	CONSTRAINT "hackathon_submissions_lists_check" CHECK(json_array_length("hackathon_submissions"."pull_request_urls") <= 10 AND json_array_length("hackathon_submissions"."ai_tools") <= 10),
	CONSTRAINT "hackathon_submissions_statement_check" CHECK("hackathon_submissions"."ai_statement" IS NULL OR length("hackathon_submissions"."ai_statement") <= 1000),
	CONSTRAINT "hackathon_submissions_submitted_check" CHECK(("hackathon_submissions"."status" = 'draft') = ("hackathon_submissions"."submitted_at" IS NULL)),
	CONSTRAINT "hackathon_submissions_complete_check" CHECK("hackathon_submissions"."status" = 'draft' OR ("hackathon_submissions"."track_id" IS NOT NULL AND "hackathon_submissions"."repository_url" IS NOT NULL AND "hackathon_submissions"."ai_statement" IS NOT NULL AND "hackathon_submissions"."original_work_attested_at" IS NOT NULL)),
	CONSTRAINT "hackathon_submissions_version_check" CHECK("hackathon_submissions"."version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_submissions_team_unique` ON `hackathon_submissions` (`team_id`);--> statement-breakpoint
CREATE INDEX `hackathon_submissions_event_status_index` ON `hackathon_submissions` (`event_id`,`status`);--> statement-breakpoint
CREATE INDEX `hackathon_submissions_track_index` ON `hackathon_submissions` (`track_id`,`event_id`);--> statement-breakpoint
CREATE TABLE `hackathon_submission_versions` (
	`submission_id` text NOT NULL,
	`version` integer NOT NULL,
	`track_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`repository_url` text NOT NULL,
	`demo_video_url` text,
	`pull_request_urls` text NOT NULL,
	`ai_tools` text NOT NULL,
	`ai_statement` text NOT NULL,
	`original_work_attested_at` integer NOT NULL,
	`submitted_at` integer NOT NULL,
	`submitted_by` text,
	PRIMARY KEY(`submission_id`, `version`),
	FOREIGN KEY (`submission_id`) REFERENCES `hackathon_submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submitted_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
