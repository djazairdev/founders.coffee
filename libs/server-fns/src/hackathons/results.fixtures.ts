import { id } from '@founders-coffee/core';
import {
  eq,
  hackathonScores,
  hackathonSubmissions,
  hackathonSubmissionVersions,
  hackathonTeams,
  hackathons as hackathonRows,
  type Db,
} from '@founders-coffee/db';

import {
  criteriaOf,
  judgeOf,
  submitted,
  toJudging,
} from './judging.fixtures.js';

/** A second team's entry in the hackathon, submitted, as its last submitted version. */
export const rivalEntry = async (
  db: Db,
  eventId: string,
  trackId: string,
  title = 'Souk',
) => {
  const [teamId, submissionId] = [id('tea'), id('sub')];
  const now = new Date();
  await db
    .insert(hackathonTeams)
    .values({ id: teamId, eventId, name: `${title} Squad` });
  await db.insert(hackathonSubmissions).values({
    id: submissionId,
    eventId,
    teamId,
    trackId,
    title,
    description: 'A market on a phone.',
    repositoryUrl: 'https://github.com/souk-squad/souk',
    aiStatement: 'We used no AI tools.',
    originalWorkAttestedAt: now,
    status: 'submitted',
    submittedAt: now,
  });
  await db.insert(hackathonSubmissionVersions).values({
    submissionId,
    version: 1,
    trackId,
    title,
    description: 'A market on a phone.',
    repositoryUrl: 'https://github.com/souk-squad/souk',
    pullRequestUrls: [],
    aiTools: [],
    aiStatement: 'We used no AI tools.',
    originalWorkAttestedAt: now,
    submittedAt: now,
  });
  return { teamId, submissionId };
};

/** One judge's scores for an entry, one value per criterion. */
export const scored = (
  db: Db,
  eventId: string,
  judgeId: string,
  submissionId: string,
  values: Readonly<Record<string, number>>,
) =>
  db.insert(hackathonScores).values(
    Object.entries(values).map(([criterionId, value]) => ({
      submissionId,
      judgeId,
      criterionId,
      eventId,
      value,
    })),
  );

/** Move the hackathon past the end of judging. */
export const judgingEnded = (db: Db, eventId: string) =>
  db
    .update(hackathonRows)
    .set({ judgingEndsAt: new Date(Date.now() - 1_000) })
    .where(eq(hackathonRows.eventId, eventId));

/** A hackathon in judging with two submitted entries, two criteria and an accepted judge. */
export const judgingTwoEntries = async (db: Db) => {
  const { eventId, trackId, submissionId } = await submitted(db);
  const criteria = await criteriaOf(db, eventId);
  await toJudging(db, eventId);
  const judge = await judgeOf(db, eventId);
  const rival = await rivalEntry(db, eventId, trackId);
  return { eventId, trackId, submissionId, criteria, judge, rival };
};

export type JudgingTwoEntries = Awaited<ReturnType<typeof judgingTwoEntries>>;

/** The judge scores both entries, the first entry higher unless `isTie`. */
export const scoreBoth = async (
  db: Db,
  setup: JudgingTwoEntries,
  isTie = false,
) => {
  const { eventId, judge, criteria, submissionId, rival } = setup;
  await scored(db, eventId, judge.judgeId, submissionId, {
    [criteria.impact]: 8,
    [criteria.craft]: 4,
  });
  await scored(db, eventId, judge.judgeId, rival.submissionId, {
    [criteria.impact]: isTie ? 8 : 5,
    [criteria.craft]: isTie ? 4 : 3,
  });
};
