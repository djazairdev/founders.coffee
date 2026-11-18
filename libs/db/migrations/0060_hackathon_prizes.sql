-- B-HKN-04: prizes. The unique index on a track's id and hackathon comes first: it is the parent key
-- of the composite foreign key that holds a prize's track to its own hackathon.
CREATE UNIQUE INDEX `hackathon_tracks_event_unique` ON `hackathon_tracks` (`id`,`event_id`);--> statement-breakpoint
CREATE TABLE `hackathon_prizes` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`track_id` text,
	`place` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`provider_name` text NOT NULL,
	`value_amount_minor` integer,
	`value_currency` text,
	`confirmed_at` integer,
	`confirmation_note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hackathons`(`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`,`event_id`) REFERENCES `hackathon_tracks`(`id`,`event_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hackathon_prizes_place_check" CHECK("hackathon_prizes"."place" >= 1),
	CONSTRAINT "hackathon_prizes_value_check" CHECK(("hackathon_prizes"."value_amount_minor" IS NULL AND "hackathon_prizes"."value_currency" IS NULL) OR ("hackathon_prizes"."value_amount_minor" > 0 AND "hackathon_prizes"."value_currency" IS NOT NULL)),
	CONSTRAINT "hackathon_prizes_confirmation_check" CHECK(("hackathon_prizes"."confirmed_at" IS NULL) = ("hackathon_prizes"."confirmation_note" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `hackathon_prizes_event_idx` ON `hackathon_prizes` (`event_id`,`place`);--> statement-breakpoint
CREATE INDEX `hackathon_prizes_track_idx` ON `hackathon_prizes` (`track_id`,`event_id`);
