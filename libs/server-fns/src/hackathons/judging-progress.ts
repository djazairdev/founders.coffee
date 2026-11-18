import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  getHackathon,
  listHackathonCriteria,
  listJudgesRemindedSince,
  listOrganiserHackathonJudges,
  listResultsEntries,
  readJudgingRecord,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { enqueueHackathonTeamNotices } from '../notifications/hackathon-team.js';
import { hackathonNotFound } from './edit-context.js';
import { loadPlaceHackathon, type PlaceHackathon } from './place-context.js';

const REMINDER_GAP_MS = 24 * 3_600_000;

export type JudgingProgressJudge = {
  readonly judgeId: string;
  readonly name: string;
  readonly progress: hackathons.JudgeProgress;
};

export type JudgingProgressView = {
  readonly stage: hackathons.JudgingStage;
  readonly entries: number;
  readonly judges: readonly JudgingProgressJudge[];
};

type Scored = JudgingProgressJudge & { readonly userId: string };

const judgesOf = async (
  db: Db,
  eventId: string,
): Promise<{
  readonly entries: number;
  readonly judges: readonly Scored[];
}> => {
  const [entries, criteria, record, places] = await Promise.all([
    listResultsEntries(db, eventId),
    listHackathonCriteria(db, eventId),
    readJudgingRecord(db, eventId),
    listOrganiserHackathonJudges(db, eventId),
  ]);
  return {
    entries: entries.length,
    judges: places.flatMap((place) =>
      place.status === 'accepted' && place.userId
        ? [
            {
              judgeId: place.id,
              userId: place.userId,
              name: place.name ?? '',
              progress: hackathons.judgeProgressOf(
                entries.map((entry) =>
                  hackathons.judgeEntryState({
                    isRecused: record.recusals.some(
                      (recusal) =>
                        recusal.entryId === entry.submissionId &&
                        recusal.judgeId === place.id,
                    ),
                    scoredCount: record.scores.filter(
                      (score) =>
                        score.entryId === entry.submissionId &&
                        score.judgeId === place.id,
                    ).length,
                    criteriaCount: criteria.length,
                  }),
                ),
              ),
            },
          ]
        : [],
    ),
  };
};

const stageOf = (hackathon: PlaceHackathon, now: number) =>
  hackathons.judgingStageAt({ ...hackathon, now });

/**
 * How far each accepted judge has got, for the hackathon's organisers (B-JDG-08): the entries each
 * scored, still has to score and recused from. The middleware has checked that the reader may
 * manage it.
 */
export const judgingProgressResolver = async (
  db: Db,
  eventId: string,
  now: number = Date.now(),
): Promise<Result<JudgingProgressView>> => {
  const loaded = await loadPlaceHackathon(db, eventId);
  if (!loaded.ok) return loaded;
  const { entries, judges } = await judgesOf(db, eventId);
  return ok({
    stage: stageOf(loaded.data, now),
    entries,
    judges: judges.map(({ judgeId, name, progress }) => ({
      judgeId,
      name,
      progress,
    })),
  });
};

/**
 * Remind the judges who still have scores to give (B-JDG-08), while judging is open. A judge is
 * reminded at most once in 24 hours, however often an organiser presses the button; a judge who
 * finished is never reminded. Answers how many were reminded now and how many were reminded lately.
 */
export const remindJudgesResolver = async (
  db: Db,
  eventId: string,
  now: number = Date.now(),
): Promise<
  Result<{ readonly reminded: number; readonly alreadyReminded: number }>
> => {
  const loaded = await loadPlaceHackathon(db, eventId);
  if (!loaded.ok) return loaded;
  const stage = stageOf(loaded.data, now);
  if (stage === 'not_started')
    return err(new AppError('judging_not_started', 'Judging has not started'));
  if (stage === 'closed')
    return err(new AppError('judging_closed', 'Judging is closed'));
  const found = await getHackathon(db, eventId);
  if (!found) return hackathonNotFound();
  const { judges } = await judgesOf(db, eventId);
  const owing = judges.filter((judge) => judge.progress.toScore > 0);
  const reminded = await listJudgesRemindedSince(
    db,
    eventId,
    new Date(now - REMINDER_GAP_MS),
  );
  const due = owing.filter((judge) => !reminded.includes(judge.userId));
  await enqueueHackathonTeamNotices(db, {
    templateKey: 'hackathon_judge_reminder',
    event: found.event,
    recipients: due.map((judge) => judge.userId),
    team: '',
    name: null,
  });
  logger.info('Hackathon judges reminded', { eventId, reminded: due.length });
  return ok({
    reminded: due.length,
    alreadyReminded: owing.length - due.length,
  });
};
