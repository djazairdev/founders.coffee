-- B-SAFE-03: marks an entry disqualified after its results froze, so its rank stays as published.
ALTER TABLE `hackathon_results` ADD `disqualified_at` integer;