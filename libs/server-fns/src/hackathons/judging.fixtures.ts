import { id } from '@founders-coffee/core';
import {
  eq,
  events,
  hackathonJudges,
  hackathons as hackathonRows,
  user,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { members } from '../rsvps/resolver.fixtures.js';
import { saveSubmissionDraftResolver } from './submission-drafts.js';
import { submitSubmissionResolver } from './submission-submit.js';
import { building } from './submission.fixtures.js';

const HOUR = 3_600_000;
export const [captain, member] = members.map((row) => row.id) as [
  string,
  string,
];

export const unwrap = <T>(
  result: { ok: true; data: T } | { ok: false; error: Error },
) => {
  if (!result.ok) throw result.error;
  return result.data;
};

export const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

const save = (db: Db, eventId: string, version: number, values: object) =>
  saveSubmissionDraftResolver(db, {
    eventId,
    userId: captain,
    version,
    draft: hackathons.submissionDraftSchema.parse({
      title: 'Ledger',
      description: 'A ledger a corner shop keeps on its phone.',
      repositoryUrl: 'https://github.com/byte-club/ledger',
      aiStatement: 'We wrote every line ourselves and used no AI tools.',
      ...values,
    }),
  });

export const judgeOf = async (
  db: Db,
  eventId: string,
  status: 'accepted' | 'invited' = 'accepted',
) => {
  const userId = id('usr');
  await db
    .insert(user)
    .values({ id: userId, name: 'Judge', email: `${userId}@judges.test` });
  const judgeId = id('jdg');
  await db.insert(hackathonJudges).values({
    id: judgeId,
    eventId,
    userId: status === 'invited' ? null : userId,
    status,
    tokenHash: id('tkh'),
    invitedBy: userId,
  });
  return { userId, judgeId };
};

/** Move the hackathon on to judging: kickoff three hours ago, the deadline an hour ago. */
export const toJudging = async (db: Db, eventId: string) => {
  await db
    .update(events)
    .set({ startsAt: new Date(Date.now() - 3 * HOUR) })
    .where(eq(events.id, eventId));
  await db
    .update(hackathonRows)
    .set({ submissionDeadlineAt: new Date(Date.now() - HOUR) })
    .where(eq(hackathonRows.eventId, eventId));
};

/**
 * A team that submitted "Ledger" and then saved a later draft it never submitted, with the
 * hackathon still building.
 */
export const submitted = async (db: Db) => {
  const { eventId, trackId } = await building(db, [captain, member]);
  const draft = unwrap(await save(db, eventId, 0, { trackId }));
  const sent = unwrap(
    await submitSubmissionResolver(db, null, {
      eventId,
      userId: captain,
      version: draft.version,
    }),
  );
  unwrap(await save(db, eventId, sent.version, { trackId, title: 'Ledger 2' }));
  return { eventId, trackId, submissionId: sent.submissionId };
};
