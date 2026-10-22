import { ok, type Result } from '@founders-coffee/core';
import {
  listCriterionScales,
  listJudgeProgress,
  readJudgePlace,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { loadPlaceHackathon } from './place-context.js';

export type JudgePageEntry = {
  readonly submissionId: string;
  readonly teamName: string;
  readonly title: string;
  readonly trackTitle: string | null;
  readonly state: hackathons.JudgeEntryState;
};

export type JudgePageView = {
  readonly event: {
    readonly id: string;
    readonly title: string;
    readonly slug: string;
    readonly marketCode: string;
  };
  readonly submissionDeadlineAt: number;
  readonly judgingEndsAt: number;
  readonly stage: hackathons.JudgingStage;
  readonly isJudge: boolean;
  readonly entries: readonly JudgePageEntry[];
  readonly progress: hackathons.JudgeProgress;
};

/**
 * A member's judge page for a hackathon (B-JDG-06): where judging stands, decided here from the
 * hackathon's dates, whether they judge it, and, for an accepted judge while judging is open, every
 * submitted entry marked to score, scored or recused, with their progress across them.
 */
export const judgePageResolver = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
  now: number = Date.now(),
): Promise<Result<JudgePageView>> => {
  const loaded = await loadPlaceHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const hackathon = loaded.data;
  const stage = hackathons.judgingStageAt({ ...hackathon, now });
  const place = await readJudgePlace(db, input);
  const isJudge = place?.status === 'accepted';
  const [rows, criteria] =
    isJudge && stage === 'judging'
      ? await Promise.all([
          listJudgeProgress(db, {
            eventId: input.eventId,
            judgeId: place.judgeId,
          }),
          listCriterionScales(db, input.eventId),
        ])
      : [[], []];
  const entries = rows.map(({ isRecused, scoredCount, ...entry }) => ({
    ...entry,
    state: hackathons.judgeEntryState({
      isRecused,
      scoredCount,
      criteriaCount: criteria.length,
    }),
  }));
  return ok({
    event: {
      id: input.eventId,
      title: hackathon.title,
      slug: hackathon.slug,
      marketCode: hackathon.marketCode,
    },
    submissionDeadlineAt: hackathon.timeline.submissionDeadlineAt,
    judgingEndsAt: hackathon.timeline.judgingEndsAt,
    stage,
    isJudge,
    entries,
    progress: hackathons.judgeProgressOf(entries.map((entry) => entry.state)),
  });
};
