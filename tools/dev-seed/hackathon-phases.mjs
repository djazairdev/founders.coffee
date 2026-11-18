import { accountId, derivedId, HACKATHON_ACCOUNT_EMAILS } from './rows.mjs';

export const HOUR = 3600;
export const DAY = 24 * HOUR;

export const {
  organiser: ORGANISER,
  captain: CAPTAIN,
  judge: JUDGE,
  teammate: TEAMMATE,
  rival: RIVAL,
} = Object.fromEntries(
  Object.entries(HACKATHON_ACCOUNT_EMAILS).map(([role, email]) => [
    role,
    accountId(email),
  ]),
);

export const ORGANISATION = derivedId('org', 'dev-code-club');

/*
 * Where each hackathon stands, as offsets from now. Together they cover every page a contributor
 * needs to see: registration still open, teams building, judges scoring, and results out.
 */
export const PHASES = [
  {
    key: 'registration',
    title: 'هاكاثون الجزائر — التسجيل مفتوح',
    opens: -DAY,
    closes: 3 * DAY,
    starts: 5 * DAY,
    deadline: 8 * DAY,
    judgingEnds: 12 * DAY,
  },
  {
    key: 'building',
    title: 'هاكاثون الجزائر — الفرق تعمل',
    opens: -6 * DAY,
    closes: -2 * DAY,
    starts: -DAY,
    deadline: 2 * DAY,
    judgingEnds: 6 * DAY,
  },
  {
    key: 'judging',
    title: 'هاكاثون الجزائر — التحكيم جارٍ',
    opens: -12 * DAY,
    closes: -7 * DAY,
    starts: -5 * DAY,
    deadline: -DAY,
    judgingEnds: 3 * DAY,
  },
  {
    key: 'results',
    title: 'هاكاثون الجزائر — النتائج منشورة',
    opens: -25 * DAY,
    closes: -20 * DAY,
    starts: -15 * DAY,
    deadline: -10 * DAY,
    judgingEnds: -5 * DAY,
    publishedAt: -4 * DAY,
  },
];

export const CRITERIA = [
  { key: 'impact', name: 'الأثر', weight: 60 },
  { key: 'craft', name: 'الجودة التقنية', weight: 40 },
];
export const SCALE = 5;

export const TEAMS = [
  {
    key: 'byte-club',
    name: 'Byte Club',
    title: 'Ledger',
    members: [
      { id: CAPTAIN, isCaptain: 1 },
      { id: TEAMMATE, isCaptain: 0 },
    ],
    scores: [5, 4],
  },
  {
    key: 'copper-crew',
    name: 'Copper Crew',
    title: 'Souk',
    members: [{ id: RIVAL, isCaptain: 1 }],
    scores: [3, 3],
  },
];

export const eventId = (phase) =>
  derivedId('evt', `dev-hackathon-${phase.key}`);
export const trackId = (phase) => derivedId('trk', `${phase.key}/payments`);
export const teamId = (phase, team) =>
  derivedId('tem', `${phase.key}/${team.key}`);
export const entryId = (phase, team) =>
  derivedId('sub', `${phase.key}/${team.key}`);
export const judgeId = (phase) => derivedId('jdg', `${phase.key}/judge`);
export const criterionId = (phase, criterion) =>
  derivedId('crt', `${phase.key}/${criterion.key}`);

/** The total the ranking gives one judge's scores: each as a share of its weight. */
const totalOf = (scores) =>
  CRITERIA.reduce(
    (sum, { weight }, index) => sum + (scores[index] / SCALE) * weight,
    0,
  );

/** The rows behind a team's place and its submitted entry in one hackathon. */
export const entryRows = (phase, team, now) => {
  const eventKey = eventId(phase);
  const submittedAt = now + Math.min(phase.deadline, -HOUR);
  const description = 'مشروع تجريبي، لتجربة صفحات التقديم والتحكيم والنتائج.';
  const repository = `https://github.com/dev-seed/${team.key}`;
  const statement = 'لم نستعمل أي أداة ذكاء اصطناعي.';
  return {
    team: {
      id: teamId(phase, team),
      event_id: eventKey,
      name: team.name,
    },
    members: team.members.map(({ id, isCaptain }) => ({
      team_id: teamId(phase, team),
      event_id: eventKey,
      user_id: id,
      is_captain: isCaptain,
    })),
    submission: {
      id: entryId(phase, team),
      event_id: eventKey,
      team_id: teamId(phase, team),
      track_id: trackId(phase),
      title: team.title,
      description,
      repository_url: repository,
      ai_statement: statement,
      original_work_attested_at: submittedAt,
      status: 'submitted',
      submitted_at: submittedAt,
    },
    version: {
      submission_id: entryId(phase, team),
      version: 1,
      track_id: trackId(phase),
      title: team.title,
      description,
      repository_url: repository,
      pull_request_urls: '[]',
      ai_tools: '[]',
      ai_statement: statement,
      original_work_attested_at: submittedAt,
      submitted_at: submittedAt,
      submitted_by: team.members[0].id,
    },
  };
};

export const scoreRows = (phase, team) =>
  CRITERIA.map((criterion, index) => ({
    submission_id: entryId(phase, team),
    judge_id: judgeId(phase),
    criterion_id: criterionId(phase, criterion),
    event_id: eventId(phase),
    value: team.scores[index],
    comment: 'عمل جيد، واصلوا تطويره.',
  }));

export const resultRow = (phase, team, rank) => ({
  submission_id: entryId(phase, team),
  event_id: eventId(phase),
  version: 1,
  team_id: teamId(phase, team),
  team_name: team.name,
  title: team.title,
  track_id: trackId(phase),
  track_title: 'المدفوعات',
  total: totalOf(team.scores),
  rank,
  track_rank: rank,
  criteria: JSON.stringify(
    CRITERIA.map((criterion, index) => ({
      criterionId: criterionId(phase, criterion),
      name: criterion.name,
      weight: criterion.weight,
      scale: SCALE,
      mean: team.scores[index],
      judgeCount: 1,
    })),
  ),
});

export const certificateRow = (phase, userId, kind, placement, issuedAt) => {
  const key = `${phase.key}/${userId}/${kind}`;
  return {
    id: derivedId('cer', key),
    event_id: eventId(phase),
    user_id: userId,
    kind,
    placement,
    verification_code: derivedId('cer', `code/${key}`).slice('cer_'.length),
    issued_at: issuedAt,
  };
};
