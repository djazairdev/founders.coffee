-- B-EVT-08: events.venue becomes nullable for online events, which takes a table rebuild in SQLite.
-- Dropping `events` runs an implicit DELETE that cascades to every table below, so each is copied
-- aside first and put back after the rename, as 0021 did for `user`. Foreign keys are deferred for
-- the whole migration, and it fails if any reference is left dangling at the end.
PRAGMA defer_foreign_keys = ON;
--> statement-breakpoint
CREATE TABLE `__evt08_event_rsvps` AS SELECT * FROM `event_rsvps`;
--> statement-breakpoint
CREATE TABLE `__evt08_scheduled_notifications` AS SELECT * FROM `scheduled_notifications`;
--> statement-breakpoint
CREATE TABLE `__evt08_event_attendance` AS SELECT * FROM `event_attendance`;
--> statement-breakpoint
CREATE TABLE `__evt08_event_closeouts` AS SELECT * FROM `event_closeouts`;
--> statement-breakpoint
CREATE TABLE `__evt08_event_feedback` AS SELECT * FROM `event_feedback`;
--> statement-breakpoint
CREATE TABLE `__evt08_city_waitlist_launches` AS SELECT * FROM `city_waitlist_launches`;
--> statement-breakpoint
CREATE TABLE `__evt08_city_waitlist_notifications` AS SELECT * FROM `city_waitlist_notifications`;
--> statement-breakpoint
CREATE TABLE `__evt08_chat_channels` AS SELECT * FROM `chat_channels`;
--> statement-breakpoint
CREATE TABLE `__evt08_chat_members` AS SELECT * FROM `chat_members`;
--> statement-breakpoint
CREATE TABLE `__evt08_chat_messages` AS SELECT * FROM `chat_messages`;
--> statement-breakpoint
CREATE TABLE `__evt08_event_organisers` AS SELECT * FROM `event_organisers`;
--> statement-breakpoint
CREATE TABLE `__new_events` (
	`id` text PRIMARY KEY NOT NULL,
	`host_id` text NOT NULL,
	`market_code` text NOT NULL,
	`state_code` text NOT NULL,
	`city_code` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`venue` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`rsvps` integer DEFAULT 0 NOT NULL,
	`language` text NOT NULL,
	`languages` text DEFAULT '[]' NOT NULL,
	`latitude` real,
	`longitude` real,
	`venue_address` text,
	`slug` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`kind` text DEFAULT 'meetup' NOT NULL,
	`format` text DEFAULT 'in_person' NOT NULL,
	`meeting_url` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`cancelled_at` integer,
	`cancellation_reason` text,
	FOREIGN KEY (`host_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`market_code`) REFERENCES `markets`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_events` (`id`, `host_id`, `market_code`, `state_code`, `city_code`, `title`, `description`, `venue`, `starts_at`, `ends_at`, `rsvps`, `language`, `languages`, `latitude`, `longitude`, `venue_address`, `slug`, `status`, `kind`, `version`, `created_at`, `updated_at`, `cancelled_at`, `cancellation_reason`) SELECT `id`, `host_id`, `market_code`, `state_code`, `city_code`, `title`, `description`, `venue`, `starts_at`, `ends_at`, `rsvps`, `language`, `languages`, `latitude`, `longitude`, `venue_address`, `slug`, `status`, `kind`, `version`, `created_at`, `updated_at`, `cancelled_at`, `cancellation_reason` FROM `events`;
--> statement-breakpoint
DROP TABLE `events`;
--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;
--> statement-breakpoint
CREATE UNIQUE INDEX `events_market_code_slug_unique` ON `events` (`market_code`,`slug`);
--> statement-breakpoint
CREATE INDEX `events_host_id_index` ON `events` (`host_id`);
--> statement-breakpoint
INSERT INTO `event_rsvps` SELECT * FROM `__evt08_event_rsvps`;
--> statement-breakpoint
INSERT INTO `scheduled_notifications` SELECT * FROM `__evt08_scheduled_notifications`;
--> statement-breakpoint
INSERT INTO `event_attendance` SELECT * FROM `__evt08_event_attendance`;
--> statement-breakpoint
INSERT INTO `event_closeouts` SELECT * FROM `__evt08_event_closeouts`;
--> statement-breakpoint
INSERT INTO `event_feedback` SELECT * FROM `__evt08_event_feedback`;
--> statement-breakpoint
INSERT INTO `city_waitlist_launches` SELECT * FROM `__evt08_city_waitlist_launches`;
--> statement-breakpoint
INSERT INTO `city_waitlist_notifications` SELECT * FROM `__evt08_city_waitlist_notifications`;
--> statement-breakpoint
INSERT INTO `chat_channels` SELECT * FROM `__evt08_chat_channels`;
--> statement-breakpoint
INSERT INTO `chat_members` SELECT * FROM `__evt08_chat_members`;
--> statement-breakpoint
INSERT INTO `chat_messages` SELECT * FROM `__evt08_chat_messages`;
--> statement-breakpoint
INSERT INTO `event_organisers` SELECT * FROM `__evt08_event_organisers`;
--> statement-breakpoint
DROP TABLE `__evt08_event_rsvps`;
--> statement-breakpoint
DROP TABLE `__evt08_scheduled_notifications`;
--> statement-breakpoint
DROP TABLE `__evt08_event_attendance`;
--> statement-breakpoint
DROP TABLE `__evt08_event_closeouts`;
--> statement-breakpoint
DROP TABLE `__evt08_event_feedback`;
--> statement-breakpoint
DROP TABLE `__evt08_city_waitlist_launches`;
--> statement-breakpoint
DROP TABLE `__evt08_city_waitlist_notifications`;
--> statement-breakpoint
DROP TABLE `__evt08_chat_channels`;
--> statement-breakpoint
DROP TABLE `__evt08_chat_members`;
--> statement-breakpoint
DROP TABLE `__evt08_chat_messages`;
--> statement-breakpoint
DROP TABLE `__evt08_event_organisers`;
--> statement-breakpoint
CREATE TABLE `__evt08_fk_check` (`violations` integer NOT NULL CHECK (`violations` = 0));
--> statement-breakpoint
INSERT INTO `__evt08_fk_check` SELECT count(*) FROM pragma_foreign_key_check;
--> statement-breakpoint
DROP TABLE `__evt08_fk_check`;
--> statement-breakpoint
PRAGMA defer_foreign_keys = OFF;
