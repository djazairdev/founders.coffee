CREATE TABLE `hackathon_tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`brief` text NOT NULL,
	`partner_name` text,
	`source_urls` text DEFAULT '[]' NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hackathons`(`event_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hackathon_tracks_partner_check" CHECK(("hackathon_tracks"."kind" = 'partner_technology') = ("hackathon_tracks"."partner_name" IS NOT NULL)),
	CONSTRAINT "hackathon_tracks_sources_check" CHECK(("hackathon_tracks"."kind" = 'open_source') = ("hackathon_tracks"."source_urls" <> '[]')),
	CONSTRAINT "hackathon_tracks_position_check" CHECK("hackathon_tracks"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_tracks_position_unique` ON `hackathon_tracks` (`event_id`,`position`);