-- B-SAFE-05: indexes for the daily retention sweep: hackathons by their end, and the skills lines still kept.
CREATE INDEX `events_hackathon_ends_index` ON `events` (`ends_at`) WHERE kind = 'hackathon';--> statement-breakpoint
CREATE INDEX `hackathon_registrations_skills_index` ON `hackathon_registrations` (`event_id`) WHERE skills IS NOT NULL;