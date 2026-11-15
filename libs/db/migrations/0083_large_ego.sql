PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__snapshot_hackathon_prize_awards` AS SELECT * FROM `hackathon_prize_awards`;--> statement-breakpoint
CREATE TABLE `__new_hackathon_prizes` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`track_id` text,
	`place` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`provider_name` text,
	`value_amount_minor` integer,
	`value_currency` text,
	`confirmed_at` integer,
	`confirmation_note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hackathons`(`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`,`event_id`) REFERENCES `hackathon_tracks`(`id`,`event_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hackathon_prizes_place_check" CHECK("__new_hackathon_prizes"."place" >= 1),
	CONSTRAINT "hackathon_prizes_value_check" CHECK(("__new_hackathon_prizes"."value_amount_minor" IS NULL AND "__new_hackathon_prizes"."value_currency" IS NULL) OR ("__new_hackathon_prizes"."value_amount_minor" > 0 AND "__new_hackathon_prizes"."value_currency" IS NOT NULL)),
	CONSTRAINT "hackathon_prizes_confirmation_check" CHECK(("__new_hackathon_prizes"."confirmed_at" IS NULL) = ("__new_hackathon_prizes"."confirmation_note" IS NULL))
);
--> statement-breakpoint
INSERT INTO `__new_hackathon_prizes`("id", "event_id", "track_id", "place", "title", "description", "provider_name", "value_amount_minor", "value_currency", "confirmed_at", "confirmation_note", "created_at", "updated_at") SELECT "id", "event_id", "track_id", "place", "title", "description", "provider_name", "value_amount_minor", "value_currency", "confirmed_at", "confirmation_note", "created_at", "updated_at" FROM `hackathon_prizes`;--> statement-breakpoint
DROP TABLE `hackathon_prizes`;--> statement-breakpoint
ALTER TABLE `__new_hackathon_prizes` RENAME TO `hackathon_prizes`;--> statement-breakpoint
INSERT INTO `hackathon_prize_awards` SELECT * FROM `__snapshot_hackathon_prize_awards`;--> statement-breakpoint
DROP TABLE `__snapshot_hackathon_prize_awards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `hackathon_prizes_event_idx` ON `hackathon_prizes` (`event_id`,`place`);--> statement-breakpoint
CREATE INDEX `hackathon_prizes_track_idx` ON `hackathon_prizes` (`track_id`,`event_id`);
