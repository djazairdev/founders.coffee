-- B-PRJ-01: project pages and who is on them. Projects first, since their members reference them.
-- A project made from a hackathon entry names it, once per entry, and forgets it if the entry goes.
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`problem` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`stage` text NOT NULL,
	`repository_url` text,
	`demo_url` text,
	`website_url` text,
	`market_code` text NOT NULL,
	`source_submission_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`search_indexable` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`market_code`) REFERENCES `markets`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_submission_id`) REFERENCES `hackathon_submissions`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "projects_slug_check" CHECK(length("projects"."slug") BETWEEN 3 AND 80 AND "projects"."slug" NOT GLOB '*[^a-z0-9-]*' AND "projects"."slug" NOT GLOB '-*' AND "projects"."slug" NOT GLOB '*-' AND "projects"."slug" NOT GLOB '*--*'),
	CONSTRAINT "projects_text_check" CHECK(length(trim("projects"."title")) BETWEEN 1 AND 100 AND length("projects"."problem") <= 500 AND length("projects"."description") <= 2000),
	CONSTRAINT "projects_urls_check" CHECK(("projects"."repository_url" IS NULL OR length("projects"."repository_url") <= 2048) AND ("projects"."demo_url" IS NULL OR length("projects"."demo_url") <= 2048) AND ("projects"."website_url" IS NULL OR length("projects"."website_url") <= 2048)),
	CONSTRAINT "projects_enum_check" CHECK("projects"."stage" IN ('idea', 'prototype', 'mvp', 'launched') AND "projects"."status" IN ('draft', 'published', 'hidden')),
	CONSTRAINT "projects_version_check" CHECK("projects"."version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_source_submission_unique` ON `projects` (`source_submission_id`);--> statement-breakpoint
CREATE INDEX `projects_market_status_index` ON `projects` (`market_code`,`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `project_members` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`listed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`project_id`, `user_id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "project_members_role_check" CHECK("project_members"."role" IN ('owner', 'member'))
);
--> statement-breakpoint
CREATE INDEX `project_members_user_index` ON `project_members` (`user_id`);
