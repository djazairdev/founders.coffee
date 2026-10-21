ALTER TABLE `organization` ADD `owner_left_at` integer;--> statement-breakpoint
CREATE INDEX `organization_owner_left_index` ON `organization` (`owner_left_at`) WHERE owner_left_at IS NOT NULL;