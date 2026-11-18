-- B-SAFE-02: an administrator's decision on a hackathon report: the reason the team is told and the
-- evidence a disqualification rests on, both empty for an open or dismissed report.
ALTER TABLE `hackathon_reports` ADD `decision_reason` text;--> statement-breakpoint
ALTER TABLE `hackathon_reports` ADD `evidence` text;