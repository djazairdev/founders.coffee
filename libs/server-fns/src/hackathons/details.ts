import { z } from 'zod';

import {
  AppError,
  err,
  ok,
  type AttendanceMode,
  type EventFormat,
  type EventStatus,
  type HackathonAiPolicy,
  type Result,
} from '@founders-coffee/core';
import {
  readHackathonDraft,
  saveDraftHackathonDetails,
  type Db,
  type Hackathon,
  type HackathonDraftRows,
  type HackathonLead,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger, reportError } from '@founders-coffee/observability';

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
  readonly details: HackathonDetailsView | null;
  readonly isEditable: boolean;
};

const notFound = () =>
  err(new AppError('event_not_found', 'No hackathon for this event'));

const notEditable = () =>
  err(
    new AppError(
      'hackathon_not_editable',
      'The hackathon has moved on from its draft',
    ),
  );

const detailsView = (row: Hackathon): HackathonDetailsView => ({
  rules: row.rules,
  minimumAge: row.minimumAge,
  attendanceModes: row.attendanceModes,
  teamMin: row.teamMin,
  teamMax: row.teamMax,
  capacity: row.capacity,
  registrationOpensAt: row.registrationOpensAt.getTime(),
  registrationClosesAt: row.registrationClosesAt.getTime(),
  submissionDeadlineAt: row.submissionDeadlineAt.getTime(),
  judgingEndsAt: row.judgingEndsAt.getTime(),
  aiPolicy: row.aiPolicy,
  aiPolicyNote: row.aiPolicyNote,
  licenceNote: row.licenceNote,
});

/** Whether the organiser flow may still write this hackathon: a draft whose details are not in review. */
const isDraft = (rows: HackathonDraftRows): boolean =>
  rows.event.status === 'draft' &&
  (rows.details === null || rows.details.reviewStatus === 'draft');

/**
 * Read a hackathon for its organisers (B-HKN-12): its event, the organisation that leads it, and
 * its details once saved. The middleware has checked that the reader may manage it. A market with
 * hackathons off answers as the feature does everywhere else.
 */
export const hackathonDraftResolver = async (
  db: Db,
  eventId: string,
): Promise<Result<HackathonDraftView>> => {
  const rows = await readHackathonDraft(db, eventId);
  if (!rows || rows.event.endsAt === null) return notFound();
  const disabled = await requireHackathonsEnabled(db, rows.event.marketCode);
  if (disabled) return err(disabled);
  const { event } = rows;
  return ok({
    event: {
      id: event.id,
      title: event.title,
      marketCode: event.marketCode,
      cityCode: event.cityCode,
      startsAt: event.startsAt.getTime(),
      endsAt: rows.event.endsAt.getTime(),
      format: event.format,
      status: event.status,
    },
    organisation: rows.organisation,
    details: rows.details ? detailsView(rows.details) : null,
    isEditable: isDraft(rows),
  });
};

/** The details the database stores, with every optional value the organiser left out as `null`. */
const storedDetails = (details: hackathons.HackathonDetailsInput) => ({
  rules: details.rules ?? null,
  minimumAge: details.minimumAge ?? null,
  attendanceModes: details.attendanceModes,
  teamMin: details.teamMin,
  teamMax: details.teamMax,
  capacity: details.capacity ?? null,
  registrationOpensAt: new Date(details.registrationOpensAt),
  registrationClosesAt: new Date(details.registrationClosesAt),
  submissionDeadlineAt: new Date(details.submissionDeadlineAt),
  judgingEndsAt: new Date(details.judgingEndsAt),
  aiPolicy: details.aiPolicy,
  aiPolicyNote: details.aiPolicyNote ?? null,
  licenceNote: details.licenceNote ?? null,
});

/**
 * Save the organiser flow's second step (B-HKN-12): the rules, eligibility, attendance, team size,
 * capacity, timeline, AI policy and licence of a hackathon still being drafted.
 *
 * The details are held to the saved event, whose kickoff, demo day and format they depend on, and
 * written in one statement that also checks the hackathon is still a draft, so a change that lands
 * after it moved on writes nothing and says so. Saving again replaces what was saved.
 */
export const saveHackathonDetailsResolver = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly organisationId: string;
    readonly details: hackathons.HackathonDetailsInput;
  },
): Promise<Result<{ readonly eventId: string }>> => {
  const rows = await readHackathonDraft(db, input.eventId);
  if (!rows || rows.event.endsAt === null) return notFound();
  const disabled = await requireHackathonsEnabled(db, rows.event.marketCode);
  if (disabled) return err(disabled);
  if (!isDraft(rows)) return notEditable();
  const checked = hackathons
    .hackathonDetailsFor({
      startsAt: rows.event.startsAt.getTime(),
      endsAt: rows.event.endsAt.getTime(),
      format: rows.event.format,
    })
    .safeParse(input.details);
  if (!checked.success) {
    const flat = z.flattenError(checked.error);
    return err(
      new AppError('validation_failed', 'The details do not fit the event', {
        fields: flat.fieldErrors,
        formErrors: flat.formErrors,
      }),
    );
  }
  try {
    const written = await saveDraftHackathonDetails(db, {
      eventId: input.eventId,
      details: storedDetails(checked.data),
    });
    if (!written) return notEditable();
  } catch (error) {
    reportError(error, {
      operation: 'save_hackathon_details',
      market: rows.event.marketCode,
      eventId: input.eventId,
    });
    return err(
      new AppError('hackathon_save_failed', 'The details could not be saved'),
    );
  }
  logger.info('hackathon_details_saved', {
    eventId: input.eventId,
    organisationId: input.organisationId,
    market: rows.event.marketCode,
  });
  return ok({ eventId: input.eventId });
};
