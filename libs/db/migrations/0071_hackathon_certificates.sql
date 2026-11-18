-- B-CRT-01: what a member earned from a hackathon whose results are out: taking part, a prize, or
-- finishing the judging, with the random code its public page goes by. New table, nothing to backfill.
CREATE TABLE `hackathon_certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`placement` text,
	`verification_code` text NOT NULL,
	`issued_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `hackathons`(`event_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hackathon_certificates_verification_code_unique` ON `hackathon_certificates` (`verification_code`);--> statement-breakpoint
CREATE INDEX `hackathon_certificates_user_index` ON `hackathon_certificates` (`user_id`,`event_id`);--> statement-breakpoint
CREATE INDEX `hackathon_certificates_event_index` ON `hackathon_certificates` (`event_id`);