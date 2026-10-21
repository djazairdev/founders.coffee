-- B-ORG-07: the approved platform organisation that leads the events "Hosted by founders.coffee".
-- Selected from markets, so it lands wherever Algeria is configured and is a no-op on an empty
-- database, where libs/db's seed and the dev seed add it after the markets.
INSERT INTO `organization` (`id`, `name`, `slug`, `kind`, `status`, `market_code`, `description`, `website_url`)
SELECT 'org_founders_coffee', 'founders.coffee', 'founders-coffee', 'platform', 'approved', `code`, 'founders.coffee runs free meetups and hackathons for founders and builders.', 'https://founders.coffee'
FROM `markets` WHERE `code` = 'DZ'
ON CONFLICT DO NOTHING;
