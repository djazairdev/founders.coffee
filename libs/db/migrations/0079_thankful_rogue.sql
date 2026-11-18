PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_event_attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`market_code` text NOT NULL,
	`state_code` text,
	`city_code` text,
	`outcome` text NOT NULL,
	`recorded_by_user_id` text NOT NULL,
	`recorded_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`market_code`) REFERENCES `markets`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_event_attendance`("id", "event_id", "user_id", "market_code", "state_code", "city_code", "outcome", "recorded_by_user_id", "recorded_at", "updated_at") SELECT "id", "event_id", "user_id", "market_code", "state_code", "city_code", "outcome", "recorded_by_user_id", "recorded_at", "updated_at" FROM `event_attendance`;--> statement-breakpoint
DROP TABLE `event_attendance`;--> statement-breakpoint
ALTER TABLE `__new_event_attendance` RENAME TO `event_attendance`;--> statement-breakpoint
CREATE UNIQUE INDEX `event_attendance_event_user_unique` ON `event_attendance` (`event_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `event_attendance_user_index` ON `event_attendance` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `__new_event_closeouts` (
	`event_id` text PRIMARY KEY NOT NULL,
	`market_code` text NOT NULL,
	`state_code` text,
	`city_code` text,
	`outcome` text NOT NULL,
	`walk_in_count` integer DEFAULT 0 NOT NULL,
	`would_host_again` integer,
	`host_friction` text DEFAULT '[]' NOT NULL,
	`private_note` text,
	`submitted_by_user_id` text NOT NULL,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_by_user_id` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`market_code`) REFERENCES `markets`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_event_closeouts`("event_id", "market_code", "state_code", "city_code", "outcome", "walk_in_count", "would_host_again", "host_friction", "private_note", "submitted_by_user_id", "submitted_at", "updated_by_user_id", "updated_at", "version") SELECT "event_id", "market_code", "state_code", "city_code", "outcome", "walk_in_count", "would_host_again", "host_friction", "private_note", "submitted_by_user_id", "submitted_at", "updated_by_user_id", "updated_at", "version" FROM `event_closeouts`;--> statement-breakpoint
DROP TABLE `event_closeouts`;--> statement-breakpoint
ALTER TABLE `__new_event_closeouts` RENAME TO `event_closeouts`;--> statement-breakpoint
CREATE INDEX `event_closeouts_market_outcome_index` ON `event_closeouts` (`market_code`,`outcome`,`submitted_at`);--> statement-breakpoint
CREATE TABLE `__new_event_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`market_code` text NOT NULL,
	`state_code` text,
	`city_code` text,
	`value_rating` text NOT NULL,
	`would_return` integer NOT NULL,
	`comment` text,
	`comment_language` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`market_code`) REFERENCES `markets`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_event_feedback`("id", "event_id", "user_id", "market_code", "state_code", "city_code", "value_rating", "would_return", "comment", "comment_language", "created_at", "updated_at") SELECT "id", "event_id", "user_id", "market_code", "state_code", "city_code", "value_rating", "would_return", "comment", "comment_language", "created_at", "updated_at" FROM `event_feedback`;--> statement-breakpoint
DROP TABLE `event_feedback`;--> statement-breakpoint
ALTER TABLE `__new_event_feedback` RENAME TO `event_feedback`;--> statement-breakpoint
CREATE UNIQUE INDEX `event_feedback_event_user_unique` ON `event_feedback` (`event_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `event_feedback_event_index` ON `event_feedback` (`event_id`,`created_at`);--> statement-breakpoint
--> statement-breakpoint
PRAGMA foreign_keys=ON;
