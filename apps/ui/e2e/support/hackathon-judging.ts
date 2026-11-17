import { d1 } from './d1';
import type { E2eLocale } from './messages';
import { newId, RUN_ID } from './run';

const HOUR_SECONDS = 3_600;
const DAY_SECONDS = 86_400;
export const WINNER = 'Ledger';
export const RUNNER_UP = 'Market map';

/** The rows one locale's run writes, named by its locale and the run so parallel runs never meet. */
export const hackathonFor = (locale: E2eLocale) => {
  const person = (role: string) => ({
    id: `usr_e2e_hkn_judging_${role}_${locale}_${RUN_ID}`,
    email: `e2e-hkn-judging-${role}-${locale}-${RUN_ID}@e2e.invalid`,
  });
  return {
    eventId: newId('evt'),
    organisationId: newId('org'),
    trackId: newId('trk'),
    criteria: [newId('crt'), newId('crt')] as const,
    winnerId: newId('sub'),
    runnerUpId: newId('sub'),
    host: person('host'),
    scoringJudge: person('scorer'),
    recusingJudge: person('recuser'),
    mentor: person('mentor'),
    winnerCaptain: person('winner'),
    runnerUpCaptain: person('runner'),
    slug: `e2e-hkn-judging-${locale}-${RUN_ID}`,
    title: `E2E judging ${locale} ${RUN_ID}`,
  };
};

export type Hackathon = ReturnType<typeof hackathonFor>;

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

/** One team of one with a submitted entry, as the team and submit screens leave them. */
const seedEntry = (
  hackathon: Hackathon,
  entry: { id: string; title: string; team: string; captainId: string },
  submittedAt: number,
): string => {
  const teamId = newId('tem');
  const { eventId, trackId } = hackathon;
  return (
    `INSERT INTO hackathon_registrations (id, event_id, user_id, attendance_mode) VALUES ('${newId('hrg')}', '${eventId}', '${entry.captainId}', 'in_person'); ` +
    `INSERT INTO hackathon_teams (id, event_id, name) VALUES ('${teamId}', '${eventId}', '${entry.team}'); ` +
    `INSERT INTO hackathon_team_members (team_id, event_id, user_id, is_captain) VALUES ('${teamId}', '${eventId}', '${entry.captainId}', 1); ` +
    `INSERT INTO hackathon_submissions (id, event_id, team_id, track_id, title, description, repository_url, ai_statement, original_work_attested_at, status, submitted_at) ` +
    `VALUES ('${entry.id}', '${eventId}', '${teamId}', '${trackId}', '${entry.title}', 'Seeded for judging.', 'https://github.com/e2e-team/entry', 'No AI tools.', ${submittedAt}, 'submitted', ${submittedAt}); ` +
    `INSERT INTO hackathon_submission_versions (submission_id, version, track_id, title, description, repository_url, pull_request_urls, ai_tools, ai_statement, original_work_attested_at, submitted_at) ` +
    `VALUES ('${entry.id}', 1, '${trackId}', '${entry.title}', 'Seeded for judging.', 'https://github.com/e2e-team/entry', '[]', '[]', 'No AI tools.', ${submittedAt}, ${submittedAt}); `
  );
};

/**
 * A hackathon in judging with two entries, two criteria, and time to invite judges and mentors.
 */
export const seed = (hackathon: Hackathon): void => {
  const now = nowSeconds();
  const deadline = now - HOUR_SECONDS;
  const startsAt = deadline - 3 * DAY_SECONDS;
  const { eventId, host } = hackathon;
  const people = [
    hackathon.host,
    hackathon.scoringJudge,
    hackathon.recusingJudge,
    hackathon.mentor,
    hackathon.winnerCaptain,
    hackathon.runnerUpCaptain,
  ];
  d1(
    people
      .map(
        ({ id, email }) =>
          `INSERT INTO user (id, name, email) VALUES ('${id}', 'Member ${RUN_ID}', '${email}'); `,
      )
      .join('') +
      `INSERT INTO events (id, host_id, market_code, state_code, city_code, title, description, venue, starts_at, ends_at, language, languages, slug, kind, status, format) ` +
      `VALUES ('${eventId}', '${host.id}', 'DZ', '16', '556', '${hackathon.title}', 'Seeded for judging and publishing.', 'Café E2E', ${startsAt}, ${deadline + HOUR_SECONDS}, 'en', json_array('en'), '${hackathon.slug}', 'hackathon', 'published', 'in_person'); ` +
      `INSERT INTO hackathons (event_id, attendance_modes, team_min, team_max, registration_opens_at, registration_closes_at, submission_deadline_at, judging_ends_at, ai_policy, review_status) ` +
      `VALUES ('${eventId}', json_array('in_person'), 1, 4, ${startsAt - 2 * DAY_SECONDS}, ${startsAt - DAY_SECONDS}, ${deadline}, ${now + DAY_SECONDS}, 'disclosed', 'approved'); ` +
      `INSERT INTO hackathon_tracks (id, event_id, kind, title, brief, position) ` +
      `VALUES ('${hackathon.trackId}', '${eventId}', 'founder_problem', 'Payments', 'Help a corner shop take payments.', 0); ` +
      hackathon.criteria
        .map(
          (id, position) =>
            `INSERT INTO hackathon_criteria (id, event_id, name, description, weight, scale, position) VALUES ('${id}', '${eventId}', 'Criterion ${position + 1}', 'How well the entry does.', ${position === 0 ? 60 : 40}, 5, ${position}); `,
        )
        .join('') +
      `INSERT INTO organization (id, name, slug, kind, status, market_code, description) VALUES ('${hackathon.organisationId}', 'E2E organisers ${RUN_ID}', '${hackathon.slug}', 'club', 'approved', 'DZ', 'Seeded to organise a hackathon.'); ` +
      `INSERT INTO member (id, organization_id, user_id, role) VALUES ('${newId('mbr')}', '${hackathon.organisationId}', '${host.id}', 'owner'); ` +
      `INSERT INTO event_organisers (event_id, organisation_id, role) VALUES ('${eventId}', '${hackathon.organisationId}', 'lead'); ` +
      seedEntry(
        hackathon,
        {
          id: hackathon.winnerId,
          title: WINNER,
          team: 'Byte Club',
          captainId: hackathon.winnerCaptain.id,
        },
        deadline,
      ) +
      seedEntry(
        hackathon,
        {
          id: hackathon.runnerUpId,
          title: RUNNER_UP,
          team: 'Copper Crew',
          captainId: hackathon.runnerUpCaptain.id,
        },
        deadline,
      ),
  );
};

/** Bring the end of judging into the past, the way the clock would, so the organiser can publish. */
export const endJudging = (hackathon: Hackathon): void => {
  d1(
    `UPDATE hackathons SET judging_ends_at = ${nowSeconds() - 60} WHERE event_id = '${hackathon.eventId}'`,
  );
};

export const scoreCount = (
  hackathon: Hackathon,
  submissionId: string,
): number =>
  d1<{ scores: number }>(
    `SELECT count(*) AS scores FROM hackathon_scores WHERE event_id = '${hackathon.eventId}' AND submission_id = '${submissionId}'`,
  )[0]?.scores ?? 0;

export const recusalCount = (hackathon: Hackathon): number =>
  d1<{ recusals: number }>(
    `SELECT count(*) AS recusals FROM hackathon_recusals WHERE event_id = '${hackathon.eventId}'`,
  )[0]?.recusals ?? 0;

export const frozenResults = (hackathon: Hackathon) =>
  d1<{ title: string; rank: number; total: number }>(
    `SELECT title, rank, total FROM hackathon_results WHERE event_id = '${hackathon.eventId}' ORDER BY rank`,
  );
