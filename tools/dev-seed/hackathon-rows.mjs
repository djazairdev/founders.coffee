import {
  CAPTAIN,
  certificateRow,
  CRITERIA,
  criterionId,
  entryId,
  entryRows,
  eventId,
  HOUR,
  JUDGE,
  judgeId,
  ORGANISATION,
  ORGANISER,
  PHASES,
  resultRow,
  RIVAL,
  SCALE,
  scoreRows,
  TEAMMATE,
  TEAMS,
  trackId,
} from './hackathon-phases.mjs';
import { derivedId } from './rows.mjs';

/**
 * A hackathon in every phase, organised by `dev-host`'s club, so every page can be seen without
 * clicking through a whole hackathon (B-LCH-01).
 *
 * `dev-member` captains a team and `dev-member-two` judges, in every phase past registration. In
 * registration nobody holds a team yet, and `dev-member` has not registered, so the form shows. In
 * building one entry is in. In judging the judge has scored one entry of two. In results the ranks,
 * a prize and the certificates are out.
 *
 * @param {number} now seconds since the epoch.
 * @returns {Record<string, object[]>} rows by table, in an order the foreign keys allow.
 */
export const hackathonRows = (now) => {
  const started = PHASES.filter(({ key }) => key !== 'registration');
  const entries = (phase) =>
    phase.key === 'building' ? TEAMS.slice(0, 1) : TEAMS;
  const judging = PHASES.filter(({ deadline }) => deadline < 0);
  const results = PHASES.find(({ key }) => key === 'results');
  const issuedAt = now + results.publishedAt;
  const prizeId = derivedId('prz', 'results/first');
  const [winner, runnerUp] = TEAMS;
  const teams = started.flatMap((phase) =>
    entries(phase).map((team) => entryRows(phase, team, now)),
  );
  const registered = (phase) =>
    phase.key === 'registration'
      ? [{ user: RIVAL, isLooking: 1 }]
      : [CAPTAIN, TEAMMATE, RIVAL].map((user) => ({ user, isLooking: 0 }));

  return {
    events: PHASES.map((phase) => ({
      id: eventId(phase),
      slug: `dev-hackathon-${phase.key}`,
      host_id: ORGANISER,
      market_code: 'DZ',
      state_code: '16',
      city_code: '556',
      title: phase.title,
      description: 'هاكاثون تجريبي، لرؤية كل صفحة دون المرور بهاكاثون كامل.',
      venue: 'Café des Délices, Hydra',
      starts_at: now + phase.starts,
      ends_at: now + phase.deadline + HOUR,
      language: 'ar',
      languages: '["ar"]',
      kind: 'hackathon',
      format: 'in_person',
      status: 'published',
    })),
    hackathons: PHASES.map((phase) => ({
      event_id: eventId(phase),
      attendance_modes: '["in_person"]',
      team_min: 1,
      team_max: 4,
      registration_opens_at: now + phase.opens,
      registration_closes_at: now + phase.closes,
      submission_deadline_at: now + phase.deadline,
      judging_ends_at: now + phase.judgingEnds,
      ai_policy: 'disclosed',
      review_status: 'approved',
      results_published_at: phase.publishedAt ? now + phase.publishedAt : null,
      registered_count: registered(phase).length,
    })),
    event_organisers: PHASES.map((phase) => ({
      event_id: eventId(phase),
      organisation_id: ORGANISATION,
      role: 'lead',
    })),
    hackathon_tracks: PHASES.map((phase) => ({
      id: trackId(phase),
      event_id: eventId(phase),
      kind: 'founder_problem',
      title: 'المدفوعات',
      brief: 'ساعدوا متجرًا صغيرًا على تلقي المدفوعات وتتبعها بسهولة.',
      position: 0,
    })),
    hackathon_criteria: PHASES.flatMap((phase) =>
      CRITERIA.map((criterion, position) => ({
        id: criterionId(phase, criterion),
        event_id: eventId(phase),
        name: criterion.name,
        description: 'ما مدى تحقيق المشروع لهذا المعيار؟',
        weight: criterion.weight,
        scale: SCALE,
        position,
      })),
    ),
    hackathon_prizes: [
      {
        id: prizeId,
        event_id: eventId(results),
        place: 1,
        title: 'الجائزة الأولى',
        description: 'جائزة تجريبية.',
        provider_name: 'Code Club Alger',
        confirmed_at: issuedAt,
        confirmation_note: 'مؤكدة للتجربة.',
      },
    ],
    hackathon_judges: PHASES.map((phase) => ({
      id: judgeId(phase),
      event_id: eventId(phase),
      user_id: JUDGE,
      status: 'accepted',
      token_hash: derivedId('tkn', `judge/${phase.key}`),
      invited_by: ORGANISER,
      responded_at: now + phase.opens,
    })),
    hackathon_registrations: PHASES.flatMap((phase) =>
      registered(phase).map(({ user, isLooking }) => ({
        id: derivedId('reg', `${phase.key}/${user}`),
        event_id: eventId(phase),
        user_id: user,
        status: 'registered',
        attendance_mode: 'in_person',
        looking_for_team: isLooking,
      })),
    ),
    hackathon_teams: teams.map(({ team }) => team),
    hackathon_team_members: teams.flatMap(({ members }) => members),
    hackathon_submissions: teams.map(({ submission }) => submission),
    hackathon_submission_versions: teams.map(({ version }) => version),
    hackathon_scores: judging.flatMap((phase) =>
      phase.key === 'judging'
        ? scoreRows(phase, winner)
        : TEAMS.flatMap((team) => scoreRows(phase, team)),
    ),
    hackathon_results: [
      resultRow(results, winner, 1),
      resultRow(results, runnerUp, 2),
    ],
    hackathon_certificates: [
      certificateRow(results, CAPTAIN, 'winner', 'الجائزة الأولى', issuedAt),
      certificateRow(results, CAPTAIN, 'participant', null, issuedAt),
      certificateRow(results, TEAMMATE, 'winner', 'الجائزة الأولى', issuedAt),
      certificateRow(results, TEAMMATE, 'participant', null, issuedAt),
      certificateRow(results, RIVAL, 'participant', null, issuedAt),
      certificateRow(results, JUDGE, 'judge', null, issuedAt),
    ],
    hackathon_prize_awards: [
      {
        prize_id: prizeId,
        submission_id: entryId(results, winner),
        awarded_at: issuedAt,
      },
    ],
  };
};
