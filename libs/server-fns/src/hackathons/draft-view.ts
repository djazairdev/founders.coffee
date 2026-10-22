import {
  err,
  ok,
  type AttendanceMode,
  type EventFormat,
  type EventStatus,
  type HackathonAiPolicy,
  type HackathonCriterionScale,
  type HackathonReviewStatus,
  type HackathonTrackKind,
  type Money,
  type Result,
} from '@founders-coffee/core';
import {
  listHackathonCriteria,
  listHackathonTracks,
  listOrganiserHackathonPrizes,
  readHackathonDraft,
  type Db,
  type HackathonLead,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import {
  detailsInputOf,
  hackathonNotFound,
  isHackathonEditable,
} from './edit-context.js';
import { requireHackathonsEnabled } from './flag.js';

export type HackathonDetailsView = {
  readonly rules: string | null;
  readonly minimumAge: number | null;
  readonly attendanceModes: readonly AttendanceMode[];
  readonly teamMin: number;
  readonly teamMax: number;
  readonly capacity: number | null;
  readonly registrationOpensAt: number;
  readonly registrationClosesAt: number;
  readonly submissionDeadlineAt: number;
  readonly judgingEndsAt: number;
  readonly aiPolicy: HackathonAiPolicy;
  readonly aiPolicyNote: string | null;
  readonly licenceNote: string | null;
};

export type HackathonTrackView = {
  readonly id: string;
  readonly kind: HackathonTrackKind;
  readonly title: string;
  readonly brief: string;
  readonly partnerName: string | null;
  readonly sourceUrls: readonly string[];
};

export type HackathonPrizeView = {
  readonly id: string;
  readonly trackId: string | null;
  readonly place: number;
  readonly title: string;
  readonly description: string;
  readonly providerName: string;
  readonly value: Money | null;
  readonly isConfirmed: boolean;
};

export type HackathonCriterionView = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly weight: number;
  readonly scale: HackathonCriterionScale;
};

export type HackathonDraftView = {
  readonly event: {
    readonly id: string;
    readonly title: string;
    readonly marketCode: string;
    readonly cityCode: string;
    readonly startsAt: number;
    readonly endsAt: number;
    readonly format: EventFormat;
    readonly status: EventStatus;
  };
  readonly organisation: HackathonLead;
  readonly version: number;
  readonly stage: hackathons.HackathonEditStage;
  readonly isEditable: boolean;
  readonly review: {
    readonly status: HackathonReviewStatus;
    readonly note: string | null;
    readonly gaps: readonly hackathons.HackathonReadinessGap[];
  };
  readonly details: HackathonDetailsView | null;
  readonly tracks: readonly HackathonTrackView[];
  readonly prizes: readonly HackathonPrizeView[];
  readonly criteria: readonly HackathonCriterionView[];
};

/**
 * Read a hackathon for its organisers (B-HKN-12, B-HKN-07): its event, the organisation that leads
 * it, the version every edit is checked against, how far it can still be edited, and what has been
 * saved of it: its details, tracks, every prize confirmed or not, and its rubric. The middleware
 * has checked that the reader may manage it. A market with hackathons off answers as the feature
 * does everywhere else.
 */
export const hackathonDraftResolver = async (
  db: Db,
  eventId: string,
  now: number = Date.now(),
): Promise<Result<HackathonDraftView>> => {
  const rows = await readHackathonDraft(db, eventId);
  const endsAt = rows?.event.endsAt;
  if (!rows || !endsAt) return hackathonNotFound();
  const disabled = await requireHackathonsEnabled(db, rows.event.marketCode);
  if (disabled) return err(disabled);
  const [tracks, prizes, criteria] = await Promise.all([
    listHackathonTracks(db, eventId),
    listOrganiserHackathonPrizes(db, eventId),
    listHackathonCriteria(db, eventId),
  ]);
  const details = rows.details ? detailsInputOf(rows.details) : null;
  const stage = hackathons.editStageAt(
    details,
    rows.event.status === 'published',
    now,
  );
  const { event } = rows;
  return ok({
    event: {
      id: event.id,
      title: event.title,
      marketCode: event.marketCode,
      cityCode: event.cityCode,
      startsAt: event.startsAt.getTime(),
      endsAt: endsAt.getTime(),
      format: event.format,
      status: event.status,
    },
    organisation: rows.organisation,
    version: event.version,
    stage,
    isEditable: isHackathonEditable(rows, stage),
    review: {
      status: rows.details?.reviewStatus ?? 'draft',
      note: rows.details?.reviewNote ?? null,
      gaps: hackathons.hackathonReadinessGaps({
        hasDetails: rows.details !== null,
        trackCount: tracks.length,
        criterionWeights: criteria.map((criterion) => criterion.weight),
      }),
    },
    details: details && {
      ...details,
      rules: details.rules ?? null,
      minimumAge: details.minimumAge ?? null,
      capacity: details.capacity ?? null,
      aiPolicyNote: details.aiPolicyNote ?? null,
      licenceNote: details.licenceNote ?? null,
    },
    tracks: tracks.map((track) => ({
      id: track.id,
      kind: track.kind,
      title: track.title,
      brief: track.brief,
      partnerName: track.partnerName,
      sourceUrls: track.sourceUrls,
    })),
    prizes: prizes.map(({ confirmedAt, ...prize }) => ({
      ...prize,
      isConfirmed: confirmedAt !== null,
    })),
    criteria: criteria.map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      description: criterion.description,
      weight: criterion.weight,
      scale: criterion.scale,
    })),
  });
};
