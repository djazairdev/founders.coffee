UPDATE markets
SET feature_flags = json_set(
  coalesce(feature_flags, '{}'),
  '$.hackathons',
  json('true')
)
WHERE code = 'DZ';
