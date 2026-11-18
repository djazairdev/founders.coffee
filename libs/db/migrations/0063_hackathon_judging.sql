-- B-JDG-01: judges, recusals and scores. The criteria and submissions first gain a key on
-- (id, event_id), so a score or recusal can be held to its own hackathon by composite keys. Judges
-- are never deleted with an account: a closed account leaves its places, and their scores, against
-- the tombstone.
CREATE UNIQUE INDEX `hackathon_criteria_event_unique` ON `hackathon_criteria` (`id`,`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_submissions_event_unique` ON `hackathon_submissions` (`id`,`event_id`);--> statement-breakpoint
CREATE TABLE `hackathon_judges` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text,
	`status` text DEFAULT 'invited' NOT NULL,
	`token_hash` text NOT NULL,
	`invited_by` text NOT NULL,
	`responded_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hackathons`(`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hackathon_judges_accepted_check" CHECK("hackathon_judges"."status" != 'accepted' OR "hackathon_judges"."user_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_judges_token_hash_unique` ON `hackathon_judges` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_judges_event_unique` ON `hackathon_judges` (`id`,`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_judges_user_unique` ON `hackathon_judges` (`event_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `hackathon_judges_user_index` ON `hackathon_judges` (`user_id`);--> statement-breakpoint
CREATE TABLE `hackathon_recusals` (
	`judge_id` text NOT NULL,
	`submission_id` text NOT NULL,
	`event_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`judge_id`, `submission_id`),
	FOREIGN KEY (`judge_id`,`event_id`) REFERENCES `hackathon_judges`(`id`,`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submission_id`,`event_id`) REFERENCES `hackathon_submissions`(`id`,`event_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hackathon_recusals_reason_check" CHECK(length(trim("hackathon_recusals"."reason")) BETWEEN 1 AND 500)
);
--> statement-breakpoint
CREATE INDEX `hackathon_recusals_submission_index` ON `hackathon_recusals` (`submission_id`);--> statement-breakpoint
CREATE TABLE `hackathon_scores` (
	`submission_id` text NOT NULL,
	`judge_id` text NOT NULL,
	`criterion_id` text NOT NULL,
	`event_id` text NOT NULL,
	`value` integer NOT NULL,
	`comment` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`submission_id`, `judge_id`, `criterion_id`),
	FOREIGN KEY (`judge_id`,`event_id`) REFERENCES `hackathon_judges`(`id`,`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submission_id`,`event_id`) REFERENCES `hackathon_submissions`(`id`,`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`criterion_id`,`event_id`) REFERENCES `hackathon_criteria`(`id`,`event_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hackathon_scores_value_check" CHECK("hackathon_scores"."value" BETWEEN 1 AND 10),
	CONSTRAINT "hackathon_scores_comment_check" CHECK("hackathon_scores"."comment" IS NULL OR length("hackathon_scores"."comment") <= 1000)
);
--> statement-breakpoint
CREATE INDEX `hackathon_scores_judge_index` ON `hackathon_scores` (`judge_id`);--> statement-breakpoint
CREATE INDEX `hackathon_scores_criterion_index` ON `hackathon_scores` (`criterion_id`);
