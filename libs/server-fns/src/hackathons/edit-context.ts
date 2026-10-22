import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  applyHackathonEdit,
  readHackathonDraft,
  type Db,
  type Hackathon,
  type HackathonDraftRows,
  type HackathonEditWrite,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger, reportError } from '@founders-coffee/observability';

import { requireHackathonsEnabled } from './flag.js';

export type HackathonEditTarget = {
  readonly rows: HackathonDraftRows & {
    readonly event: HackathonDraftRows['event'] & { readonly endsAt: Date };
  };
  readonly details: hackathons.HackathonDetailsInput | null;
  readonly stage: hackathons.HackathonEditStage;
};

export const hackathonNotFound = () =>
  err(new AppError('event_not_found', 'No hackathon for this event'));

export const hackathonNotEditable = () =>
  err(
    new AppError(
      'hackathon_not_editable',
      'The hackathon cannot be changed at this stage',
    ),
  );

export const hackathonConflict = () =>
  err(
    new AppError(
      'hackathon_conflict',
      'The hackathon changed while you were editing it',
    ),
  );

export const hackathonDetailsRequired = () =>
  err(
    new AppError(
      'hackathon_details_required',
      'Save the rules and who can take part first',
    ),
  );

/** A saved details row as the details an organiser edits, every empty optional left out. */
export const detailsInputOf = (
  row: Hackathon,
): hackathons.HackathonDetailsInput => ({
  registrationOpensAt: row.registrationOpensAt.getTime(),
  registrationClosesAt: row.registrationClosesAt.getTime(),
  submissionDeadlineAt: row.submissionDeadlineAt.getTime(),
  judgingEndsAt: row.judgingEndsAt.getTime(),
  attendanceModes: row.attendanceModes,
  teamMin: row.teamMin,
  teamMax: row.teamMax,
  capacity: row.capacity ?? undefined,
  minimumAge: row.minimumAge ?? undefined,
  rules: row.rules ?? undefined,
  aiPolicy: row.aiPolicy,
  aiPolicyNote: row.aiPolicyNote ?? undefined,
  licenceNote: row.licenceNote ?? undefined,
});

/**
 * Whether an organiser may edit a hackathon at all (B-HKN-07): not cancelled, not with the
 * reviewers, and not over. What each stage still allows is the domain's to say.
 */
export const isHackathonEditable = (
  rows: HackathonDraftRows,
  stage: hackathons.HackathonEditStage,
): boolean =>
  rows.event.status !== 'cancelled' &&
  rows.details?.reviewStatus !== 'submitted' &&
  stage !== 'closed';

/**
 * Load a hackathon for an organiser's edit (B-HKN-07): it exists, hackathons are on in its market,
 * it can still be edited, and it is at the `version` the organiser's page was built from. The write
 * checks the version again in the same batch; this check only spares a stale edit the work.
 */
export const loadHackathonEdit = async (
  db: Db,
  input: { readonly eventId: string; readonly version: number },
  now: number,
): Promise<Result<HackathonEditTarget>> => {
  const rows = await readHackathonDraft(db, input.eventId);
  const endsAt = rows?.event.endsAt;
  if (!rows || !endsAt) return hackathonNotFound();
  const disabled = await requireHackathonsEnabled(db, rows.event.marketCode);
  if (disabled) return err(disabled);
  const details = rows.details ? detailsInputOf(rows.details) : null;
  const stage = hackathons.editStageAt(
    details,
    rows.event.status === 'published',
    now,
  );
  if (!isHackathonEditable(rows, stage)) return hackathonNotEditable();
  if (rows.event.version !== input.version) return hackathonConflict();
  return ok({
    rows: { ...rows, event: { ...rows.event, endsAt } },
    details,
    stage,
  });
};

/**
 * Run an edit's writes with the version bump (B-HKN-07) and log it: the hackathon's new version, a
 * conflict when it moved on in between, or a save failure, reported, when the batch threw.
 */
export const runHackathonEdit = async (
  db: Db,
  target: HackathonEditTarget,
  edit: {
    readonly operation: string;
    readonly organisationId: string;
    readonly writes: readonly HackathonEditWrite[];
    readonly isSingleRow?: boolean;
  },
): Promise<Result<{ readonly eventId: string; readonly version: number }>> => {
  const { event } = target.rows;
  const context = { eventId: event.id, market: event.marketCode };
  let version: number | null;
  try {
    version = await applyHackathonEdit(db, {
      eventId: event.id,
      version: event.version,
      writes: edit.writes,
      isSingleRow: edit.isSingleRow,
    });
  } catch (error) {
    reportError(error, { operation: edit.operation, ...context });
    return err(
      new AppError('hackathon_save_failed', 'The change could not be saved'),
    );
  }
  if (version === null) return hackathonConflict();
  logger.info(edit.operation, {
    ...context,
    organisationId: edit.organisationId,
    stage: target.stage,
    version,
  });
  return ok({ eventId: event.id, version });
};
