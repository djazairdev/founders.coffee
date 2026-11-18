ALTER TABLE `member_profiles` ADD `skills` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `links` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `open_to` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `publish_skills` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `publish_links` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `publish_open_to` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `member_profiles` SET `links` = json_array(`professional_link`), `publish_links` = `publish_professional_link`, `professional_link` = NULL, `publish_professional_link` = false WHERE `professional_link` IS NOT NULL;
