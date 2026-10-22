import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import {
  disqualifyReportedTeam,
  dismissReportTarget,
  getHackathon,
  listOpenReportTargets,
  listReportedEntries,
  readReportReviewTarget,
  readTeamNoticeParties,
  type Db,
  type ReportedEntry,
  type ReportTargetSummary,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { enqueueHackathonTeamNotices } from '../notifications/hackathon-team.js';

export type ReportQueueItem = ReportTargetSummary & {
  readonly entry: Omit<ReportedEntry, 'teamId'> | null;
};

export type ReportQueue = {
  readonly items: readonly ReportQueueItem[];
  readonly hasMore: boolean;
};

export type ReportDecided = {
  readonly decision: hackathons.HackathonReportDecision;
  readonly reports: number;
};

const entryOf = (
  item: ReportTargetSummary,
  entries: readonly ReportedEntry[],
): ReportQueueItem['entry'] => {
  const found = entries.find((entry) =>
    item.targetType === 'submission'
      ? entry.submissionId === item.targetId
      : entry.teamId === item.teamId,
  );
  return found
    ? {
        submissionId: found.submissionId,
        status: found.status,
        title: found.title,
        repositoryUrl: found.repositoryUrl,
      }
    : null;
};

/**
 * One page of the reported entries and teams waiting for a decision (B-SAFE-02), each with the
 * entry as its team last submitted it, for the administrator to check against the reasons given.
 */
export const listReportQueueResolver = async (
  db: Db,
  page: number,
): Promise<Result<ReportQueue>> => {
  const queue = await listOpenReportTargets(db, page);
  const teamIds = queue.items.flatMap((item) =>
    item.teamId ? [item.teamId] : [],
  );
  const entries = await listReportedEntries(db, [...new Set(teamIds)]);
  return ok({
    items: queue.items.map((item) => ({
      ...item,
      entry: entryOf(item, entries),
    })),
    hasMore: queue.hasMore,
  });
};

const decidedAlready = () =>
  err(new AppError('report_decided', 'These reports were decided already'));

/**
 * Tell every member of a disqualified team why (B-SAFE-02), in their language, through their
 * Hackathons notices.
 */
const noticeDisqualified = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly teamId: string;
    readonly actorUserId: string;
    readonly reason: string;
  },
) => {
  const [found, parties] = await Promise.all([
    getHackathon(db, input.eventId),
    readTeamNoticeParties(db, {
      teamId: input.teamId,
      userId: input.actorUserId,
    }),
  ]);
  if (!found || !parties) return;
  await enqueueHackathonTeamNotices(db, {
    templateKey: 'hackathon_team_disqualified',
    event: found.event,
    recipients: parties.members.map((member) => member.userId),
    team: parties.teamName,
    name: null,
    reason: input.reason,
  });
};

/**
 * Decide on a reported entry or team (B-SAFE-02): dismiss its open reports, or disqualify the team
 * behind it with a reason and evidence, which decides every open report about the team, marks the
 * entry it submitted disqualified and tells its members why. Each decision is audited with the
 * administrator's Access subject in the batch that writes it; one another administrator took
 * first answers `report_decided`.
 */
export const decideReportResolver = async (
  db: Db,
  input: {
    readonly decision: hackathons.ReportDecisionInput;
    readonly actorUserId: string;
    readonly accessSubject: string | null;
  },
): Promise<Result<ReportDecided>> => {
  const { decision } = input;
  const target = await readReportReviewTarget(db, decision);
  if (!target)
    return err(new AppError('report_not_found', 'Nothing was reported'));
  const rule = hackathons.decideReportReview({ ...target, ...decision });
  if (!rule.ok) return rule;
  const base = {
    targetType: decision.targetType,
    targetId: decision.targetId,
    eventId: target.eventId,
    actorUserId: input.actorUserId,
    accessSubject: input.accessSubject,
    auditId: id('aud'),
  };
  if (decision.decision === 'dismiss' || !rule.data.teamId) {
    const reports = await dismissReportTarget(db, base);
    if (reports === 0) return decidedAlready();
    logger.info('hackathon.reports_dismissed', {
      eventId: target.eventId,
      reports,
    });
    return ok({ decision: 'dismiss', reports });
  }
  const teamId = rule.data.teamId;
  const written = await disqualifyReportedTeam(db, {
    ...base,
    teamId,
    reason: decision.reason,
    evidence: decision.evidence,
  });
  if (written.reports === 0) return decidedAlready();
  logger.info('hackathon.team_disqualified', {
    eventId: target.eventId,
    reports: written.reports,
    entries: written.entries,
  });
  await noticeDisqualified(db, {
    eventId: target.eventId,
    teamId,
    actorUserId: input.actorUserId,
    reason: decision.reason,
  });
  return ok({ decision: 'disqualify', reports: written.reports });
};
