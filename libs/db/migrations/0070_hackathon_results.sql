-- B-JDG-09: the results a hackathon published, frozen: each entry's total, ranks and tie note, with
-- its team, title, track and criteria copied, so nothing that changes later reaches them.
CREATE TABLE `hackathon_results` (
	`submission_id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`version` integer NOT NULL,
	`team_id` text NOT NULL,
	`team_name` text NOT NULL,
	`title` text NOT NULL,
	`track_id` text,
	`track_title` text,
	`total` real,
	`rank` integer,
	`track_rank` integer,
	`tie_note` text,
	`criteria` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hackathons`(`event_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `hackathon_results_event_rank_index` ON `hackathon_results` (`event_id`,`rank`);