import { cleanupRun, d1 } from './d1';

const setHackathons = (isOn: boolean): void => {
  d1(
    `UPDATE markets SET feature_flags = json_set(feature_flags, '$.hackathons', json('${isOn ? 'true' : 'false'}')) WHERE code = 'DZ'`,
  );
};

/** Turn hackathons on in Algeria for a run, and return how to put the flag back as it was. */
export const turnOnHackathons = (): (() => void) => {
  const wasOn =
    d1<{ isOn: number | null }>(
      `SELECT json_extract(feature_flags, '$.hackathons') AS isOn FROM markets WHERE code = 'DZ'`,
    )[0]?.isOn === 1;
  setHackathons(true);
  return () => setHackathons(wasOn);
};

const TABLES_BY_EVENT = [
  'hackathon_certificates',
  'hackathon_results',
  'hackathon_scores',
  'hackathon_recusals',
  'hackathon_judges',
  'hackathon_submissions',
  'hackathon_team_requests',
  'hackathon_team_members',
  'hackathon_teams',
  'hackathon_registrations',
  'hackathon_tracks',
  'hackathon_prizes',
  'hackathon_criteria',
  'event_organisers',
  'scheduled_notifications',
  'hackathons',
];

/**
 * Remove one hackathon and everything a run wrote for it, then the members it signed in and any
 * organisations it seeded for them.
 */
export const cleanupHackathon = (
  eventId: string,
  emails: readonly string[],
  organisationIds: readonly string[] = [],
): void => {
  const people = emails.map((email) => `'${email}'`).join(', ');
  d1(
    `DELETE FROM hackathon_submission_versions WHERE submission_id IN (SELECT id FROM hackathon_submissions WHERE event_id = '${eventId}'); ` +
      `DELETE FROM hackathon_team_invites WHERE team_id IN (SELECT id FROM hackathon_teams WHERE event_id = '${eventId}'); ` +
      `DELETE FROM operations_audit WHERE target_id = '${eventId}' OR actor_user_id IN (SELECT id FROM user WHERE email IN (${people})); ` +
      TABLES_BY_EVENT.map(
        (table) => `DELETE FROM ${table} WHERE event_id = '${eventId}';`,
      ).join(' '),
  );
  cleanupRun({ eventIds: [eventId], emails });
  for (const organisationId of organisationIds)
    d1(`DELETE FROM organization WHERE id = '${organisationId}'`);
};
