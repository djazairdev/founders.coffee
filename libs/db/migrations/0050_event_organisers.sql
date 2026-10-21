CREATE TABLE `event_organisers` (
	`event_id` text NOT NULL,
	`organisation_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`event_id`, `organisation_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organisation_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_organisers_one_lead_unique` ON `event_organisers` (`event_id`) WHERE role = 'lead';--> statement-breakpoint
CREATE INDEX `event_organisers_organisation_index` ON `event_organisers` (`organisation_id`);