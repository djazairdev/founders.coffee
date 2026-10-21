export const HACKATHON_METRICS = [
  'hackathon_published',
  'registration_created',
  'registration_withdrawn',
  'team_created',
  'submission_submitted',
  'judging_completed',
  'results_published',
] as const;

export type HackathonMetric = (typeof HACKATHON_METRICS)[number];
