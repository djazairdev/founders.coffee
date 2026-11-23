ALTER TABLE `hackathons` ADD COLUMN `application_questions_json` text DEFAULT '[]' NOT NULL CONSTRAINT `hackathons_application_questions_json_check` CHECK (json_valid(`application_questions_json`));
--> statement-breakpoint
ALTER TABLE `hackathon_registrations` ADD COLUMN `application_answers_json` text DEFAULT '[]' NOT NULL CONSTRAINT `hackathon_registrations_application_answers_json_check` CHECK (json_valid(`application_answers_json`));
--> statement-breakpoint
ALTER TABLE `hackathon_teams` ADD COLUMN `application_answers_json` text DEFAULT '[]' NOT NULL CONSTRAINT `hackathon_teams_application_answers_json_check` CHECK (json_valid(`application_answers_json`));
--> statement-breakpoint
CREATE INDEX `hackathon_registrations_application_answers_index` ON `hackathon_registrations` (`event_id`) WHERE `application_answers_json` != '[]';
--> statement-breakpoint
CREATE INDEX `hackathon_teams_application_answers_index` ON `hackathon_teams` (`event_id`) WHERE `application_answers_json` != '[]';
