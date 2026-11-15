UPDATE hackathons
SET ai_policy = CASE
  WHEN ai_policy = 'ai_native' THEN 'disclosed'
  WHEN ai_policy = 'restricted' AND trim(COALESCE(ai_policy_note, '')) <> '' THEN 'conditional'
  ELSE 'disclosed'
END
WHERE ai_policy IN ('ai_native', 'restricted');

UPDATE hackathon_section_drafts
SET settings = json_set(
  settings,
  '$.aiPolicy',
  CASE
    WHEN json_extract(settings, '$.aiPolicy') = 'ai_native' THEN 'disclosed'
    WHEN json_extract(settings, '$.aiPolicy') = 'restricted'
      AND trim(COALESCE(json_extract(settings, '$.aiPolicyNote'), '')) <> ''
      THEN 'conditional'
    ELSE 'disclosed'
  END
)
WHERE settings IS NOT NULL
  AND json_valid(settings)
  AND json_extract(settings, '$.aiPolicy') IN ('ai_native', 'restricted');
