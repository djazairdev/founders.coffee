CREATE TABLE `hackathons` (
	`event_id` text PRIMARY KEY NOT NULL,
	`rules` text,
	`minimum_age` integer,
	`attendance_modes` text NOT NULL,
	`team_min` integer NOT NULL,
	`team_max` integer NOT NULL,
	`capacity` integer,
	`registration_opens_at` integer NOT NULL,
	`registration_closes_at` integer NOT NULL,
	`submission_deadline_at` integer NOT NULL,
	`judging_ends_at` integer NOT NULL,
	`ai_policy` text NOT NULL,
	`ai_policy_note` text,
	`licence_note` text,
	`review_status` text DEFAULT 'draft' NOT NULL,
	`review_note` text,
	`results_published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hackathons_team_size_check" CHECK("hackathons"."team_min" >= 1 AND "hackathons"."team_max" >= "hackathons"."team_min"),
	CONSTRAINT "hackathons_capacity_check" CHECK("hackathons"."capacity" IS NULL OR "hackathons"."capacity" > 0),
	CONSTRAINT "hackathons_minimum_age_check" CHECK("hackathons"."minimum_age" IS NULL OR "hackathons"."minimum_age" > 0),
	CONSTRAINT "hackathons_dates_check" CHECK("hackathons"."registration_opens_at" < "hackathons"."registration_closes_at" AND "hackathons"."submission_deadline_at" < "hackathons"."judging_ends_at")
);
--> statement-breakpoint
CREATE INDEX `hackathons_review_status_index` ON `hackathons` (`review_status`);