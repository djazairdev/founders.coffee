-- B-SUB-08: what the maintainers did with each pull request an open-source entry linked, as the
-- hackathon's organisers record it. A pull request without a row is submitted.
CREATE TABLE `hackathon_pull_requests` (
	`submission_id` text NOT NULL,
	`url` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`submission_id`, `url`),
	FOREIGN KEY (`submission_id`) REFERENCES `hackathon_submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hackathon_pull_requests_status_check" CHECK("hackathon_pull_requests"."status" IN ('submitted', 'reviewed', 'merged'))
);
