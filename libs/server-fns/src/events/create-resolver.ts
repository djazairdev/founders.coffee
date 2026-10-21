import { AppError, err, id, type Result } from '@founders-coffee/core';
import { type EventCreateInput } from '@founders-coffee/domain';
import {
  createEventIfRouteAvailable,
  type Db,
  type Event,
} from '@founders-coffee/db';
import { reportError } from '@founders-coffee/observability';

import type { MapProvider } from '../maps/provider.js';
import { createAtFreeRoute, prepareEventRow } from './event-row.js';
import { attendHostOwnEvent } from './host-attendance.js';

/**
 * Validate + create a new event. Generates the id + slug, requires an enabled visible D1 market,
 * resolves canonical geo state/city, verifies the venue, and inserts the complete free-event row.
 * Given a lead organisation, already authorised by `requireOrganisationPermission`, it names that
 * organisation as the event's lead in the same batch (B-EVT-17). An organisation leads events only
 * in its own market; any other answers `forbidden` before anything is written.
 */
export const createEventResolverWithId = async (
  db: Db,
  mapProvider: MapProvider,
  hostId: string,
  input: EventCreateInput,
  eventId: string,
  leadOrganisationId?: string,
): Promise<Result<Event>> => {
  try {
    const row = await prepareEventRow(db, mapProvider, {
      hostId,
      eventId,
      input,
      kind: input.kind,
      status: 'published',
      leadOrganisationId,
    });
    if (!row.ok) return row;

    const created = await createAtFreeRoute(row.data, (candidate) =>
      createEventIfRouteAvailable(db, candidate, leadOrganisationId),
    );
    if (created.ok) await attendHostOwnEvent(db, created.data.id, hostId);
    return created;
  } catch (error) {
    reportError(error, {
      operation: 'create_event',
      market: input.marketCode,
      city: input.cityCode,
    });
    return err(
      new AppError('event_creation_failed', 'The event could not be created'),
    );
  }
};

export const createEventResolver = async (
  db: Db,
  mapProvider: MapProvider,
  hostId: string,
  input: EventCreateInput,
  leadOrganisationId?: string,
): Promise<Result<Event>> =>
  createEventResolverWithId(
    db,
    mapProvider,
    hostId,
    input,
    id('evt'),
    leadOrganisationId,
  );
