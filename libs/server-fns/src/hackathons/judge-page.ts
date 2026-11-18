import { ok, type Result } from '@founders-coffee/core';
import {
  hasRecused,
  listSubmissionScreenshots,
  listCriterionScales,
  listHackathonCriteria,
  listJudgeProgress,
  listJudgeScores,
  listOwnCertificates,
  readHackathonRecordOffer,
  readJudgeEntry,
  readJudgePlace,
  type Db,
  type SubmissionScreenshotView,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import type { OwnCertificate } from './certificate-page.js';
import type { JudgeEntryView } from './judge-entries.js';
import { hackathonNotFound } from './edit-context.js';
import { loadPlaceHackathon, type PlaceHackathon } from './place-context.js';

export type JudgePageEntry = {
  readonly submissionId: string;
  readonly teamName: string;
  readonly title: string;
  readonly trackTitle: string | null;
  readonly state: hackathons.JudgeEntryState;
};

type JudgingStanding = {
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
};

export type JudgePageView = JudgingStanding & {
  readonly entries: readonly JudgePageEntry[];
  readonly progress: hackathons.JudgeProgress;
  readonly recordOffer: { readonly isShown: boolean } | null;
  readonly certificates: readonly OwnCertificate[];
};

export type JudgeCriterionView = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly weight: number;
  readonly scale: number;
};

export type JudgeScoreView = {
  readonly criterionId: string;
  readonly value: number;
  readonly comment: string | null;
};

export type JudgeEntryPageView = JudgingStanding & {
  readonly isRecused: boolean;
  readonly entry: JudgeEntryView | null;
  readonly screenshots: readonly SubmissionScreenshotView[];
  readonly criteria: readonly JudgeCriterionView[];
  readonly scores: readonly JudgeScoreView[];
};

const standingOf = (
  eventId: string,
  hackathon: PlaceHackathon,
  stage: hackathons.JudgingStage,
  isJudge: boolean,
): JudgingStanding => ({
  event: {
    id: eventId,
    title: hackathon.title,
    slug: hackathon.slug,
    marketCode: hackathon.marketCode,
  },
  submissionDeadlineAt: hackathon.timeline.submissionDeadlineAt,
  judgingEndsAt: hackathon.timeline.judgingEndsAt,
  stage,
  isJudge,
});

/**
 * A member's judge page for a hackathon (B-JDG-06): where judging stands, decided here from the
 * hackathon's dates, whether they judge it, and, for an accepted judge while judging is open, every
 * submitted entry marked to score, scored or recused, with their progress across them. A draft
 * is a judge's to see and nobody else's.
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
  if (hackathon.isDraft && !isJudge) return hackathonNotFound();
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
    ...standingOf(input.eventId, hackathon, stage, isJudge),
    entries,
    progress: hackathons.judgeProgressOf(entries.map((entry) => entry.state)),
    recordOffer:
      isJudge && hackathon.isResultsPublished
        ? await readHackathonRecordOffer(db, input)
        : null,
    certificates:
      isJudge && hackathon.isResultsPublished
        ? await listOwnCertificates(db, input)
        : [],
  });
};

/**
 * One submission as a judge scores it (B-JDG-07): where judging stands, and, for an accepted judge
 * while judging is open, the entry as it was last submitted, the hackathon's criteria and the scores
 * they saved. A judge who recused is told so and given none of it, as the entries they read leave it
 * out (B-JDG-04).
 */
export const judgeEntryPageResolver = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly submissionId: string;
    readonly userId: string;
  },
  now: number = Date.now(),
): Promise<Result<JudgeEntryPageView>> => {
  const loaded = await loadPlaceHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const hackathon = loaded.data;
  const stage = hackathons.judgingStageAt({ ...hackathon, now });
  const place = await readJudgePlace(db, input);
  if (hackathon.isDraft && place?.status !== 'accepted')
    return hackathonNotFound();
  const standing = standingOf(
    input.eventId,
    hackathon,
    stage,
    place?.status === 'accepted',
  );
  const empty = {
    isRecused: false,
    entry: null,
    screenshots: [],
    criteria: [],
    scores: [],
  };
  if (place?.status !== 'accepted' || stage !== 'judging')
    return ok({ ...standing, ...empty });
  const judge = { judgeId: place.judgeId, submissionId: input.submissionId };
  if (await hasRecused(db, judge))
    return ok({ ...standing, ...empty, isRecused: true });
  const [entry, screenshots, criteria, scores] = await Promise.all([
    readJudgeEntry(db, input),
    listSubmissionScreenshots(db, input.submissionId),
    listHackathonCriteria(db, input.eventId),
    listJudgeScores(db, judge),
  ]);
  return ok({
    ...standing,
    isRecused: false,
    entry: entry && { ...entry, submittedAt: entry.submittedAt.getTime() },
    screenshots: entry ? screenshots : [],
    criteria: criteria.map(({ id, name, description, weight, scale }) => ({
      id,
      name,
      description,
      weight,
      scale,
    })),
    scores,
  });
};
