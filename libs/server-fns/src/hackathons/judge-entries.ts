import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import {
  hasRecused,
  listJudgeEntries,
  readEntryStatus,
  readJudgePlace,
  recuseFromEntry,
  type Db,
  type JudgeEntry,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { loadPlaceHackathon, type PlaceHackathon } from './place-context.js';

export type JudgeEntryView = Omit<JudgeEntry, 'submittedAt'> & {
  readonly submittedAt: number;
};

type Judge = { readonly eventId: string; readonly userId: string };

const accessOf = (hackathon: PlaceHackathon, now: number) => ({
  timeline: hackathon.timeline,
  now,
  isCancelled: hackathon.isCancelled,
  isResultsPublished: hackathon.isResultsPublished,
});

/**
 * The entries a judge reads (B-JDG-04): every submitted entry of the hackathon, as it was last
 * submitted, but those they recused from, while they are an accepted judge and judging is open.
 */
export const listJudgeEntriesResolver = async (
  db: Db,
  input: Judge,
  now: number = Date.now(),
): Promise<Result<readonly JudgeEntryView[]>> => {
  const loaded = await loadPlaceHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const place = await readJudgePlace(db, input);
  const decided = hackathons.decideJudgeAccess({
    ...accessOf(loaded.data, now),
    judge: place?.status ?? null,
  });
  if (!decided.ok || !place) return decided.ok ? notJudge() : decided;
  const entries = await listJudgeEntries(db, {
    eventId: input.eventId,
    judgeId: place.judgeId,
  });
  return ok(
    entries.map((entry) => ({
      ...entry,
      submittedAt: entry.submittedAt.getTime(),
    })),
  );
};

const notJudge = () =>
  err(new AppError('not_judge', 'Only an accepted judge reads entries'));

/**
 * Recuse a judge from an entry (B-JDG-04), giving a reason. The rule decides first; the write
 * decides again in the batch that also audits it, and when it lands nothing the rule is asked again
 * so the refusal says why. A recusal cannot be undone.
 */
export const recuseFromEntryResolver = async (
  db: Db,
  input: Judge & hackathons.RecusalInput,
  now: number = Date.now(),
): Promise<Result<{ readonly submissionId: string }>> => {
  const loaded = await loadPlaceHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const decide = async () => {
    const place = await readJudgePlace(db, input);
    const [entry, isRecused] = await Promise.all([
      readEntryStatus(db, input),
      place
        ? hasRecused(db, {
            judgeId: place.judgeId,
            submissionId: input.submissionId,
          })
        : false,
    ]);
    const decided = hackathons.decideRecusal({
      ...accessOf(loaded.data, now),
      judge: place?.status ?? null,
      entry,
      isRecused,
    });
    if (!decided.ok) return decided;
    return place ? ok(place.judgeId) : notJudge();
  };
  const decided = await decide();
  if (!decided.ok) return decided;
  const landed = await recuseFromEntry(db, {
    eventId: input.eventId,
    judgeId: decided.data,
    submissionId: input.submissionId,
    reason: input.reason,
    actorUserId: input.userId,
    auditId: id('audit'),
  });
  if (!landed) {
    const again = await decide();
    return again.ok
      ? err(new AppError('judging_closed', 'Judging closed meanwhile'))
      : again;
  }
  logger.info('hackathon.judge_recused', {
    eventId: input.eventId,
    marketCode: loaded.data.marketCode,
  });
  return ok({ submissionId: input.submissionId });
};
