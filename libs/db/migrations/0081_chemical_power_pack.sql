CREATE TABLE `hackathon_section_drafts` (
	`event_id` text PRIMARY KEY NOT NULL,
	`deadlines` text,
	`settings` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hackathon_section_drafts_content_check" CHECK(("hackathon_section_drafts"."deadlines" IS NOT NULL OR "hackathon_section_drafts"."settings" IS NOT NULL) AND ("hackathon_section_drafts"."deadlines" IS NULL OR json_valid("hackathon_section_drafts"."deadlines")) AND ("hackathon_section_drafts"."settings" IS NULL OR json_valid("hackathon_section_drafts"."settings")))
);
