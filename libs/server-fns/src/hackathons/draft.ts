import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import { type hackathons } from '@founders-coffee/domain';
import {
  createHackathonDraftIfRouteAvailable,
  type Db,
  type HackathonDetails,
} from '@founders-coffee/db';
import { logger, reportError } from '@founders-coffee/observability';

import { createAtFreeRoute, prepareEventRow } from '../events/event-row.js';
import type { MapProvider } from '../maps/provider.js';
import { requireHackathonsEnabled } from './flag.js';

export type HackathonDraftCreated = {
  readonly eventId: string;
  readonly slug: string;
};

export type CreateHackathonDraftInput = {
  readonly hostId: string;
  readonly organisationId: string;
  readonly draft: hackathons.HackathonDraft;
};

/** The details row a draft writes, with every optional value the organiser left out as `null`. */
const draftDetails = (draft: hackathons.HackathonDraft): HackathonDetails => ({
  rules: draft.rules ?? null,
  minimumAge: draft.minimumAge ?? null,
  attendanceModes: draft.attendanceModes,
  teamMin: draft.teamMin,
  teamMax: draft.teamMax,
  capacity: draft.capacity ?? null,
  registrationOpensAt: new Date(draft.registrationOpensAt),
  registrationClosesAt: new Date(draft.registrationClosesAt),
  submissionDeadlineAt: new Date(draft.submissionDeadlineAt),
  judgingEndsAt: new Date(draft.judgingEndsAt),
  aiPolicy: draft.aiPolicy,
  aiPolicyNote: draft.aiPolicyNote ?? null,
  licenceNote: draft.licenceNote ?? null,
});

/**
 * Create a hackathon as a draft, led by the organisation that creates it (B-HKN-06).
 *
 * The organisation's `hackathon:create` is checked by the middleware before this runs. The market
 * must run hackathons and accept new events, and the organisation must belong to it. The member who
 * creates it is the event's host, the event is a `draft` that no reader sees, and its details start
 * review as a `draft`; one batch writes the event, its chat, the lead organisation and the details.
 *
 * Nothing a published event sets off happens here: no host attendance, no metric, no close-out
 * prompt and no waitlist round. Those belong to publishing it, once it has been reviewed.
 */
export const createHackathonDraftResolver = async (
  db: Db,
  mapProvider: MapProvider,
  input: CreateHackathonDraftInput,
): Promise<Result<HackathonDraftCreated>> => {
  const { draft, organisationId } = input;
  try {
    const disabled = await requireHackathonsEnabled(db, draft.marketCode);
    if (disabled) return err(disabled);

    const row = await prepareEventRow(db, mapProvider, {
      hostId: input.hostId,
      eventId: id('evt'),
      input: draft,
      kind: 'hackathon',
      status: 'draft',
      leadOrganisationId: organisationId,
    });
    if (!row.ok) return row;

    const details = draftDetails(draft);
    const created = await createAtFreeRoute(row.data, (candidate) =>
      createHackathonDraftIfRouteAvailable(
        db,
        candidate,
        organisationId,
        details,
      ),
    );
    if (!created.ok) return created;

    logger.info('hackathon_draft_created', {
      eventId: created.data.id,
      organisationId,
      market: created.data.marketCode,
      city: created.data.cityCode,
    });
    return ok({ eventId: created.data.id, slug: created.data.slug });
  } catch (error) {
    reportError(error, {
      operation: 'create_hackathon_draft',
      market: draft.marketCode,
      organisationId,
    });
    return err(
      new AppError(
        'event_creation_failed',
        'The hackathon could not be created',
      ),
    );
  }
};
