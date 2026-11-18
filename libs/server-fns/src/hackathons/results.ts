import {
  AppError,
  err,
  id,
  ok,
  shortId,
  type HackathonResultTieNote,
  type Result,
} from '@founders-coffee/core';
import {
  getHackathon,
  listEventTeamMembers,
  listHackathonCriteria,
  listHackathonResults,
  listPublicHackathonPrizes,
  listResultsEntries,
  publishResults,
  readJudgingRecord,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger, type Metrics } from '@founders-coffee/observability';

import { hackathonNotFound } from './edit-context.js';
import { requireHackathonsEnabled } from './flag.js';
import { recordHackathonMetric } from './metrics.js';
import { requestResultsNotices } from '../notifications/hackathon-results-request.js';

export type HackathonResultsEntry = {
  readonly submissionId: string;
  readonly teamName: string;
  readonly title: string;
  readonly trackTitle: string | null;
  readonly total: number | null;
  readonly rank: number | null;
  readonly trackRank: number | null;
  readonly isTied: boolean;
  readonly tieNote: HackathonResultTieNote | null;
  readonly isDisqualified: boolean;
};

export type HackathonResultsView = {
  readonly stage: 'unavailable' | 'waiting' | 'open' | 'published';
  readonly judgingEndsAt: number;
  readonly publishedAt: number | null;
  readonly entries: readonly HackathonResultsEntry[];
  readonly missingEntries: readonly string[];
  readonly tiedGroups: readonly (readonly string[])[];
};

const loadRanking = async (db: Db, eventId: string) => {
  const [entries, criteria, record] = await Promise.all([
    listResultsEntries(db, eventId),
    listHackathonCriteria(db, eventId),
    readJudgingRecord(db, eventId),
  ]);
  const rankingEntries = entries.map((entry) => ({
    id: entry.submissionId,
    trackId: entry.trackId,
  }));
  const ranked = hackathons.rankEntries({
    criteria,
    entries: rankingEntries,
    scores: record.scores,
    recusals: record.recusals,
  });
  return {
    entries,
    criteria,
    record,
    ranked,
    missingEntries: hackathons.entriesMissingScores({
      entries: rankingEntries,
      criteria,
      judgeIds: record.judgeIds,
      scores: record.scores,
      recusals: record.recusals,
      ranked,
    }),
  };
};

/**
 * Where a hackathon's results stand for its organisers (B-JDG-09): nothing until judging ends, then
 * the ranking they would publish with the scores missing and the ties to settle, and once published
 * the frozen results. The middleware has checked that the reader may manage it.
 */
export const hackathonResultsResolver = async (
  db: Db,
  eventId: string,
  now: number = Date.now(),
): Promise<Result<HackathonResultsView>> => {
  const found = await getHackathon(db, eventId);
  if (!found) return hackathonNotFound();
  const { event, hackathon } = found;
  const disabled = await requireHackathonsEnabled(db, event.marketCode);
  if (disabled) return err(disabled);
  const judgingEndsAt = hackathon.judgingEndsAt.getTime();
  const nothing = {
    judgingEndsAt,
    publishedAt: null,
    entries: [],
    missingEntries: [],
    tiedGroups: [],
  };
  if (hackathon.resultsPublishedAt) {
    const frozen = await listHackathonResults(db, eventId);
    return ok({
      ...nothing,
      stage: 'published',
      publishedAt: hackathon.resultsPublishedAt.getTime(),
      entries: frozen.map((result) => ({
        submissionId: result.submissionId,
        teamName: result.teamName,
        title: result.title,
        trackTitle: result.trackTitle,
        total: result.total,
        rank: result.rank,
        trackRank: result.trackRank,
        isTied: false,
        tieNote: result.tieNote,
        isDisqualified: result.disqualifiedAt !== null,
      })),
    });
  }
  if (event.status !== 'published')
    return ok({ ...nothing, stage: 'unavailable' });
  if (now < judgingEndsAt) return ok({ ...nothing, stage: 'waiting' });
  const { entries, ranked, missingEntries } = await loadRanking(db, eventId);
  return ok({
    ...nothing,
    stage: 'open',
    missingEntries,
    tiedGroups: hackathons.tiedGroupsOf(ranked),
    entries: ranked.flatMap((place) => {
      const entry = entries.find((row) => row.submissionId === place.entryId);
      return entry
        ? [
            {
              submissionId: entry.submissionId,
              teamName: entry.teamName,
              title: entry.title,
              trackTitle: entry.trackTitle,
              total: place.total,
              rank: place.rank,
              trackRank: place.trackRank,
              isTied: place.isTieUnresolved,
              tieNote: null,
              isDisqualified: false,
            },
          ]
        : [];
    }),
  });
};

/**
 * Publish a hackathon's results and freeze them (B-JDG-09), and issue what members earned from them
 * (B-CRT-01). Later changes to teams, entries, criteria or scores never reach the frozen rows, which
 * carry their own copy of what they show.
 */
export const publishHackathonResultsResolver = async (
  db: Db,
  metrics: Metrics | null,
  input: hackathons.PublishResultsInput & { readonly actorUserId: string },
  now: number = Date.now(),
): Promise<Result<{ readonly published: number }>> => {
  const found = await getHackathon(db, input.eventId);
  if (!found) return hackathonNotFound();
  const { event, hackathon } = found;
  const disabled = await requireHackathonsEnabled(db, event.marketCode);
  if (disabled) return err(disabled);
  const { entries, criteria, record, ranked, missingEntries } =
    await loadRanking(db, input.eventId);
  const decided = hackathons.decidePublishResults({
    isPublic: event.status === 'published',
    isPublished: hackathon.resultsPublishedAt !== null,
    judgingEndsAt: hackathon.judgingEndsAt.getTime(),
    now,
    ranked,
    missingEntries,
    missingScoresReason: input.missingScoresReason,
    tieOrder: input.tieOrder,
  });
  if (!decided.ok) return decided;
  const results = decided.data.flatMap((result) => {
    const entry = entries.find((row) => row.submissionId === result.entryId);
    return entry
      ? [
          {
            ...entry,
            total: result.total,
            rank: result.rank,
            trackRank: result.trackRank,
            tieNote: result.tieNote,
            criteria: result.criteria.map((score) => {
              const criterion = criteria.find(
                (row) => row.id === score.criterionId,
              );
              return {
                criterionId: score.criterionId,
                name: criterion?.name ?? '',
                weight: criterion?.weight ?? 0,
                scale: criterion?.scale ?? 0,
                mean: score.mean,
                judgeCount: score.judgeCount,
              };
            }),
          },
        ]
      : [];
  });
  const [teamMembers, prizes] = await Promise.all([
    listEventTeamMembers(db, input.eventId),
    listPublicHackathonPrizes(db, input.eventId),
  ]);
  const certificates = hackathons
    .certificateGrantsOf({
      entries: results,
      teamMembers,
      prizes,
      judges: record.judges,
      criteriaCount: criteria.length,
      scores: record.scores,
      recusals: record.recusals,
    })
    .map((grant) => ({
      ...grant,
      id: id('cer'),
      verificationCode: shortId(id('cer')),
    }));
  const isPublished = await publishResults(db, {
    eventId: input.eventId,
    actorUserId: input.actorUserId,
    auditId: id('aud'),
    publishedAt: new Date(now),
    results,
    certificates,
    awards: hackathons.defaultPrizeAwardsOf(results, prizes),
    metadata: {
      entries: results.length,
      missingEntries: missingEntries.length,
      missingScoresReason: input.missingScoresReason,
      tieOrder: input.tieOrder,
    },
  });
  if (!isPublished)
    return err(
      new AppError(
        'results_already_published',
        'The results are already published',
      ),
    );
  recordHackathonMetric(metrics, 'results_published', {
    marketCode: event.marketCode,
    hackathonId: input.eventId,
  });
  await requestResultsNotices(input.eventId);
  logger.info('Hackathon results published', {
    eventId: input.eventId,
    entries: results.length,
    missingEntries: missingEntries.length,
  });
  return ok({ published: results.length });
};
