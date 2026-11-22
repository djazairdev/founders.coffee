import {
  eventLanguages,
  ok,
  type EventFormat,
  type HackathonAiPolicy,
  type HackathonCriterionScale,
  type AttendanceMode,
  type HackathonTrackKind,
  type Result,
} from '@founders-coffee/core';
import {
  listHackathonsForReview,
  type Db,
  type HackathonForReview,
  type HackathonReviewPrize,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

export type HackathonReviewTrack = {
  readonly id: string;
  readonly kind: HackathonTrackKind;
  readonly title: string;
  readonly brief: string;
  readonly partnerName: string | null;
  readonly sourceUrls: readonly string[];
};

export type HackathonReviewCriterion = {
  readonly name: string;
  readonly description: string;
  readonly weight: number;
  readonly scale: HackathonCriterionScale;
};

type HackathonReviewBase = {
  readonly eventId: string;
  readonly creatorEmail: string;
  readonly version: number;
  readonly title: string;
  readonly description: string;
  readonly marketCode: string;
  readonly cityCode: string | null;
  readonly startsAt: Date;
  readonly endsAt: Date | null;
  readonly timeZone: string;
  readonly organisation: {
    readonly name: string;
    readonly slug: string;
  } | null;
  readonly updatedAt: Date;
  readonly format: EventFormat;
  readonly venue: string | null;
  readonly meetingUrl: string | null;
  readonly languages: readonly string[];
  readonly tracks: readonly HackathonReviewTrack[];
  readonly prizes: readonly HackathonReviewPrize[];
  readonly criteria: readonly HackathonReviewCriterion[];
};

export type HackathonReviewReadyItem = HackathonReviewBase & {
  readonly isComplete: true;
  readonly endsAt: Date;
  readonly organisation: { readonly name: string; readonly slug: string };
  readonly registrationOpensAt: Date;
  readonly registrationClosesAt: Date;
  readonly submissionDeadlineAt: Date;
  readonly judgingEndsAt: Date;
  readonly capacity: number | null;
  readonly minimumAge: number | null;
  readonly teamMin: number;
  readonly teamMax: number;
  readonly rules: string | null;
  readonly attendanceModes: readonly AttendanceMode[];
  readonly aiPolicy: HackathonAiPolicy;
  readonly aiPolicyNote: string | null;
  readonly licenceNote: string | null;
};

export type HackathonReviewIncompleteItem = HackathonReviewBase & {
  readonly isComplete: false;
  readonly endsAt: Date | null;
  readonly organisation: {
    readonly name: string;
    readonly slug: string;
  } | null;
  readonly missingSections: readonly ('basics' | 'deadlines' | 'settings')[];
  readonly savedDeadlines: hackathons.HackathonDeadlinesInput | null;
  readonly savedSettings: hackathons.HackathonSettingsInput | null;
};

export type HackathonReviewItem =
  HackathonReviewReadyItem | HackathonReviewIncompleteItem;

export type { HackathonReviewPrize };

export type HackathonReviewQueue = {
  readonly items: readonly HackathonReviewItem[];
  readonly hasMore: boolean;
};

const itemOf = (row: HackathonForReview): HackathonReviewItem => {
  const frame = row.event.endsAt
    ? {
        startsAt: row.event.startsAt.getTime(),
        endsAt: row.event.endsAt.getTime(),
        format: row.event.format,
      }
    : null;
  const savedDeadlines = row.details
    ? {
        registrationOpensAt: row.details.registrationOpensAt.getTime(),
        registrationClosesAt: row.details.registrationClosesAt.getTime(),
        submissionDeadlineAt: row.details.submissionDeadlineAt.getTime(),
        judgingEndsAt: row.details.judgingEndsAt.getTime(),
      }
    : row.sectionDrafts?.deadlines;
  const savedSettings = row.details
    ? {
        attendanceModes: row.details.attendanceModes,
        teamMin: row.details.teamMin,
        teamMax: row.details.teamMax,
        capacity: row.details.capacity ?? undefined,
        minimumAge: row.details.minimumAge ?? undefined,
        rules: row.details.rules ?? undefined,
        aiPolicy: row.details.aiPolicy,
        aiPolicyNote: row.details.aiPolicyNote ?? undefined,
        licenceNote: row.details.licenceNote ?? undefined,
      }
    : row.sectionDrafts?.settings;
  const deadlines = frame
    ? hackathons.hackathonDeadlinesFor(frame).safeParse(savedDeadlines)
    : null;
  const settings = frame
    ? hackathons.hackathonSettingsFor(frame).safeParse(savedSettings)
    : null;
  const missingSections = [
    ...(!row.event.title.trim() ||
    !row.event.description.trim() ||
    !row.event.endsAt ||
    !row.organisation
      ? (['basics'] as const)
      : []),
    ...(!deadlines?.success ? (['deadlines'] as const) : []),
    ...(!settings?.success ? (['settings'] as const) : []),
  ];
  const base = {
    eventId: row.event.id,
    creatorEmail: row.creatorEmail,
    version: row.event.version,
    title: row.event.title,
    description: row.event.description,
    marketCode: row.event.marketCode,
    cityCode: row.event.cityCode,
    startsAt: row.event.startsAt,
    endsAt: row.event.endsAt,
    timeZone: row.timeZone,
    organisation: row.organisation,
    updatedAt: row.event.updatedAt,
    format: row.event.format,
    venue: row.event.venue,
    meetingUrl: row.event.meetingUrl,
    languages: eventLanguages(row.event),
    tracks: row.tracks.map((track) => ({
      id: track.id,
      kind: track.kind,
      title: track.title,
      brief: track.brief,
      partnerName: track.partnerName,
      sourceUrls: track.sourceUrls,
    })),
    prizes: row.prizes,
    criteria: row.criteria.map((criterion) => ({
      name: criterion.name,
      description: criterion.description,
      weight: criterion.weight,
      scale: criterion.scale,
    })),
  };
  if (
    missingSections.length > 0 ||
    !frame ||
    !row.event.endsAt ||
    !row.organisation ||
    !deadlines?.success ||
    !settings?.success
  )
    return {
      ...base,
      isComplete: false,
      missingSections,
      savedDeadlines: deadlines?.success ? deadlines.data : null,
      savedSettings: settings?.success ? settings.data : null,
    };
  return {
    ...base,
    isComplete: true,
    endsAt: row.event.endsAt,
    organisation: row.organisation,
    registrationOpensAt: new Date(deadlines.data.registrationOpensAt),
    registrationClosesAt: new Date(deadlines.data.registrationClosesAt),
    submissionDeadlineAt: new Date(deadlines.data.submissionDeadlineAt),
    judgingEndsAt: new Date(deadlines.data.judgingEndsAt),
    capacity: settings.data.capacity ?? null,
    minimumAge: settings.data.minimumAge ?? null,
    teamMin: settings.data.teamMin,
    teamMax: settings.data.teamMax,
    rules: settings.data.rules ?? null,
    attendanceModes: settings.data.attendanceModes,
    aiPolicy: settings.data.aiPolicy,
    aiPolicyNote: settings.data.aiPolicyNote ?? null,
    licenceNote: settings.data.licenceNote ?? null,
  };
};

/** One page of saved hackathon drafts, for the operator's queue (B-HKN-08, B-HKN-09). */
export const listHackathonReviewQueueResolver = async (
  db: Db,
  page: number,
): Promise<Result<HackathonReviewQueue>> => {
  const queue = await listHackathonsForReview(db, page);
  return ok({ items: queue.items.map(itemOf), hasMore: queue.hasMore });
};
