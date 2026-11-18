-- B-PRZ-01: which frozen result holds each prize, and how its delivery stands. New table; a hackathon
-- whose results are already out starts with no awards.
CREATE TABLE `hackathon_prize_awards` (
	`prize_id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`awarded_at` integer NOT NULL,
	`delivery_status` text DEFAULT 'pending' NOT NULL,
	`delivered_at` integer,
	`private_note` text,
	FOREIGN KEY (`prize_id`) REFERENCES `hackathon_prizes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submission_id`) REFERENCES `hackathon_results`(`submission_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hackathon_prize_awards_delivered_check" CHECK(("hackathon_prize_awards"."delivery_status" = 'received') = ("hackathon_prize_awards"."delivered_at" IS NOT NULL)),
	CONSTRAINT "hackathon_prize_awards_note_check" CHECK("hackathon_prize_awards"."private_note" IS NULL OR length("hackathon_prize_awards"."private_note") <= 500)
);
--> statement-breakpoint
CREATE INDEX `hackathon_prize_awards_submission_index` ON `hackathon_prize_awards` (`submission_id`);