CREATE TABLE `hackathon_criteria` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`weight` integer NOT NULL,
	`scale` integer NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hackathons`(`event_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hackathon_criteria_weight_check" CHECK("hackathon_criteria"."weight" BETWEEN 1 AND 100),
	CONSTRAINT "hackathon_criteria_scale_check" CHECK("hackathon_criteria"."scale" IN (5, 10)),
	CONSTRAINT "hackathon_criteria_position_check" CHECK("hackathon_criteria"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_criteria_position_unique` ON `hackathon_criteria` (`event_id`,`position`);