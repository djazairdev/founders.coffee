PRAGMA defer_foreign_keys = ON;--> statement-breakpoint
CREATE TABLE `__evt84_chat_channels` AS SELECT * FROM `chat_channels`;--> statement-breakpoint
CREATE TABLE `__evt84_chat_members` AS SELECT * FROM `chat_members`;--> statement-breakpoint
CREATE TABLE `__evt84_chat_messages` AS SELECT * FROM `chat_messages`;--> statement-breakpoint
CREATE TABLE `__evt84_city_waitlist_launches` AS SELECT * FROM `city_waitlist_launches`;--> statement-breakpoint
CREATE TABLE `__evt84_city_waitlist_notifications` AS SELECT * FROM `city_waitlist_notifications`;--> statement-breakpoint
CREATE TABLE `__evt84_event_attendance` AS SELECT * FROM `event_attendance`;--> statement-breakpoint
CREATE TABLE `__evt84_event_closeouts` AS SELECT * FROM `event_closeouts`;--> statement-breakpoint
CREATE TABLE `__evt84_event_feedback` AS SELECT * FROM `event_feedback`;--> statement-breakpoint
CREATE TABLE `__evt84_event_organisers` AS SELECT * FROM `event_organisers`;--> statement-breakpoint
CREATE TABLE `__evt84_event_rsvps` AS SELECT * FROM `event_rsvps`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_certificates` AS SELECT * FROM `hackathon_certificates`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_criteria` AS SELECT * FROM `hackathon_criteria`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_interest_launches` AS SELECT * FROM `hackathon_interest_launches`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_judges` AS SELECT * FROM `hackathon_judges`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_mentors` AS SELECT * FROM `hackathon_mentors`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_prize_awards` AS SELECT * FROM `hackathon_prize_awards`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_prizes` AS SELECT * FROM `hackathon_prizes`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_pull_requests` AS SELECT * FROM `hackathon_pull_requests`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_recusals` AS SELECT * FROM `hackathon_recusals`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_registrations` AS SELECT * FROM `hackathon_registrations`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_reports` AS SELECT * FROM `hackathon_reports`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_results` AS SELECT * FROM `hackathon_results`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_scores` AS SELECT * FROM `hackathon_scores`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_section_drafts` AS SELECT * FROM `hackathon_section_drafts`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_submission_versions` AS SELECT * FROM `hackathon_submission_versions`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_submissions` AS SELECT * FROM `hackathon_submissions`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_team_invites` AS SELECT * FROM `hackathon_team_invites`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_team_members` AS SELECT * FROM `hackathon_team_members`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_team_requests` AS SELECT * FROM `hackathon_team_requests`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_teams` AS SELECT * FROM `hackathon_teams`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathon_tracks` AS SELECT * FROM `hackathon_tracks`;--> statement-breakpoint
CREATE TABLE `__evt84_hackathons` AS SELECT * FROM `hackathons`;--> statement-breakpoint
CREATE TABLE `__evt84_project_members` AS SELECT * FROM `project_members`;--> statement-breakpoint
CREATE TABLE `__evt84_projects` AS SELECT * FROM `projects`;--> statement-breakpoint
CREATE TABLE `__evt84_scheduled_notifications` AS SELECT * FROM `scheduled_notifications`;--> statement-breakpoint
CREATE TABLE `__new_events` (
  `id` text PRIMARY KEY NOT NULL,
  `host_id` text NOT NULL,
  `market_code` text NOT NULL,
  `state_code` text,
  `city_code` text,
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
  `tags` text DEFAULT '[]' NOT NULL,
  `hackathon_fields` text DEFAULT '[]' NOT NULL,
  `hackathon_type_tags` text DEFAULT '[]' NOT NULL,
  `format` text DEFAULT 'in_person' NOT NULL,
  `meeting_url` text,
  `version` integer DEFAULT 1 NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  `cancelled_at` integer,
  `cancellation_reason` text,
  FOREIGN KEY (`host_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`market_code`) REFERENCES `markets`(`code`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_events` (`id`, `host_id`, `market_code`, `state_code`, `city_code`, `title`, `description`, `venue`, `starts_at`, `ends_at`, `rsvps`, `language`, `languages`, `latitude`, `longitude`, `venue_address`, `slug`, `status`, `kind`, `tags`, `hackathon_fields`, `hackathon_type_tags`, `format`, `meeting_url`, `version`, `created_at`, `updated_at`, `cancelled_at`, `cancellation_reason`) SELECT `id`, `host_id`, `market_code`, `state_code`, `city_code`, `title`, `description`, `venue`, `starts_at`, `ends_at`, `rsvps`, `language`, `languages`, `latitude`, `longitude`, `venue_address`, `slug`, `status`, `kind`, `tags`, `hackathon_fields`, `hackathon_type_tags`, `format`, `meeting_url`, `version`, `created_at`, `updated_at`, `cancelled_at`, `cancellation_reason` FROM `events`;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;--> statement-breakpoint
CREATE UNIQUE INDEX `events_market_code_slug_unique` ON `events` (`market_code`, `slug`);--> statement-breakpoint
CREATE INDEX `events_host_id_index` ON `events` (`host_id`);--> statement-breakpoint
CREATE INDEX `events_hackathon_ends_index` ON `events` (`ends_at`) WHERE kind = 'hackathon';--> statement-breakpoint
INSERT INTO `chat_channels` SELECT * FROM `__evt84_chat_channels`;--> statement-breakpoint
INSERT INTO `chat_members` SELECT * FROM `__evt84_chat_members`;--> statement-breakpoint
INSERT INTO `chat_messages` SELECT * FROM `__evt84_chat_messages`;--> statement-breakpoint
INSERT INTO `city_waitlist_launches` SELECT * FROM `__evt84_city_waitlist_launches`;--> statement-breakpoint
INSERT INTO `city_waitlist_notifications` SELECT * FROM `__evt84_city_waitlist_notifications`;--> statement-breakpoint
INSERT INTO `event_attendance` SELECT * FROM `__evt84_event_attendance`;--> statement-breakpoint
INSERT INTO `event_closeouts` SELECT * FROM `__evt84_event_closeouts`;--> statement-breakpoint
INSERT INTO `event_feedback` SELECT * FROM `__evt84_event_feedback`;--> statement-breakpoint
INSERT INTO `event_organisers` SELECT * FROM `__evt84_event_organisers`;--> statement-breakpoint
INSERT INTO `event_rsvps` SELECT * FROM `__evt84_event_rsvps`;--> statement-breakpoint
INSERT INTO `hackathon_certificates` SELECT * FROM `__evt84_hackathon_certificates`;--> statement-breakpoint
INSERT INTO `hackathon_criteria` SELECT * FROM `__evt84_hackathon_criteria`;--> statement-breakpoint
INSERT INTO `hackathon_interest_launches` SELECT * FROM `__evt84_hackathon_interest_launches`;--> statement-breakpoint
INSERT INTO `hackathon_judges` SELECT * FROM `__evt84_hackathon_judges`;--> statement-breakpoint
INSERT INTO `hackathon_mentors` SELECT * FROM `__evt84_hackathon_mentors`;--> statement-breakpoint
INSERT INTO `hackathon_prize_awards` SELECT * FROM `__evt84_hackathon_prize_awards`;--> statement-breakpoint
INSERT INTO `hackathon_prizes` SELECT * FROM `__evt84_hackathon_prizes`;--> statement-breakpoint
INSERT INTO `hackathon_pull_requests` SELECT * FROM `__evt84_hackathon_pull_requests`;--> statement-breakpoint
INSERT INTO `hackathon_recusals` SELECT * FROM `__evt84_hackathon_recusals`;--> statement-breakpoint
INSERT INTO `hackathon_registrations` SELECT * FROM `__evt84_hackathon_registrations`;--> statement-breakpoint
INSERT INTO `hackathon_reports` SELECT * FROM `__evt84_hackathon_reports`;--> statement-breakpoint
INSERT INTO `hackathon_results` SELECT * FROM `__evt84_hackathon_results`;--> statement-breakpoint
INSERT INTO `hackathon_scores` SELECT * FROM `__evt84_hackathon_scores`;--> statement-breakpoint
INSERT INTO `hackathon_section_drafts` SELECT * FROM `__evt84_hackathon_section_drafts`;--> statement-breakpoint
INSERT INTO `hackathon_submission_versions` SELECT * FROM `__evt84_hackathon_submission_versions`;--> statement-breakpoint
INSERT INTO `hackathon_submissions` SELECT * FROM `__evt84_hackathon_submissions`;--> statement-breakpoint
INSERT INTO `hackathon_team_invites` SELECT * FROM `__evt84_hackathon_team_invites`;--> statement-breakpoint
INSERT INTO `hackathon_team_members` SELECT * FROM `__evt84_hackathon_team_members`;--> statement-breakpoint
INSERT INTO `hackathon_team_requests` SELECT * FROM `__evt84_hackathon_team_requests`;--> statement-breakpoint
INSERT INTO `hackathon_teams` SELECT * FROM `__evt84_hackathon_teams`;--> statement-breakpoint
INSERT INTO `hackathon_tracks` SELECT * FROM `__evt84_hackathon_tracks`;--> statement-breakpoint
INSERT INTO `hackathons` SELECT * FROM `__evt84_hackathons`;--> statement-breakpoint
INSERT INTO `project_members` SELECT * FROM `__evt84_project_members`;--> statement-breakpoint
INSERT INTO `projects` SELECT * FROM `__evt84_projects`;--> statement-breakpoint
INSERT INTO `scheduled_notifications` SELECT * FROM `__evt84_scheduled_notifications`;--> statement-breakpoint
DROP TABLE `__evt84_chat_channels`;--> statement-breakpoint
DROP TABLE `__evt84_chat_members`;--> statement-breakpoint
DROP TABLE `__evt84_chat_messages`;--> statement-breakpoint
DROP TABLE `__evt84_city_waitlist_launches`;--> statement-breakpoint
DROP TABLE `__evt84_city_waitlist_notifications`;--> statement-breakpoint
DROP TABLE `__evt84_event_attendance`;--> statement-breakpoint
DROP TABLE `__evt84_event_closeouts`;--> statement-breakpoint
DROP TABLE `__evt84_event_feedback`;--> statement-breakpoint
DROP TABLE `__evt84_event_organisers`;--> statement-breakpoint
DROP TABLE `__evt84_event_rsvps`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_certificates`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_criteria`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_interest_launches`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_judges`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_mentors`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_prize_awards`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_prizes`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_pull_requests`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_recusals`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_registrations`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_reports`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_results`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_scores`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_section_drafts`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_submission_versions`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_submissions`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_team_invites`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_team_members`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_team_requests`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_teams`;--> statement-breakpoint
DROP TABLE `__evt84_hackathon_tracks`;--> statement-breakpoint
DROP TABLE `__evt84_hackathons`;--> statement-breakpoint
DROP TABLE `__evt84_project_members`;--> statement-breakpoint
DROP TABLE `__evt84_projects`;--> statement-breakpoint
DROP TABLE `__evt84_scheduled_notifications`;--> statement-breakpoint
CREATE TABLE `__evt84_fk_check` (`violations` integer NOT NULL CHECK (`violations` = 0));--> statement-breakpoint
INSERT INTO `__evt84_fk_check` SELECT count(*) FROM pragma_foreign_key_check;--> statement-breakpoint
DROP TABLE `__evt84_fk_check`;--> statement-breakpoint
PRAGMA defer_foreign_keys = OFF;
