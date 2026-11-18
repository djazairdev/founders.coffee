-- B-PRF-05: the member's own switch for showing their hackathon record, off for everyone. New column
-- with a default; older code never reads it.
ALTER TABLE `member_profiles` ADD `publish_hackathon_record` integer DEFAULT false NOT NULL;
