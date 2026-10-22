import {
  AppError,
  err,
  id,
  idSchema,
  ok,
  type Result,
} from '@founders-coffee/core';
import {
  addEventCoHost,
  getMarketBySlug,
  listEventCoHostChoices,
  readCoHostEventByAddress,
  readCoHostEventById,
  removeEventCoHost,
  type CoHostCandidate,
  type CoHostEvent,
  type Db,
  type EventOrganiserRow,
} from '@founders-coffee/db';
import { logger } from '@founders-coffee/observability';

export type EventCoHosts = {
  readonly event: CoHostEvent;
  readonly organisers: readonly EventOrganiserRow[];
  readonly candidates: readonly CoHostCandidate[];
};

export type CoHostOperator = {
  readonly actorUserId: string;
  readonly accessSubject: string | null;
};

type EventReference =
  | { readonly kind: 'id'; readonly eventId: string }
  | {
      readonly kind: 'address';
      readonly marketSlug: string;
      readonly slug: string;
    };

/**
 * What an operator pasted to name an event: its id, or its page's address, with or without the
 * site, the language or the query (`/en/algeria/e/coffee-and-code`, `algeria/e/coffee-and-code`).
 */
export const readEventReference = (
  reference: string,
): EventReference | null => {
  const trimmed = reference.trim();
  if (idSchema.safeParse(trimmed).success)
    return { kind: 'id', eventId: trimmed };
  let path: string;
  try {
    path = new URL(trimmed, 'https://founders.coffee/').pathname;
  } catch {
    return null;
  }
  const segments = path.split('/').filter(Boolean).map(decodeURIComponent);
  const at = segments.lastIndexOf('e');
  const marketSlug = segments[at - 1];
  const slug = segments[at + 1];
  return at > 0 && marketSlug && slug && at === segments.length - 2
    ? { kind: 'address', marketSlug, slug }
    : null;
};

/** The event a reference names, by id or by its market and slug; null when it names none. */
const findEvent = async (
  db: Db,
  reference: string,
): Promise<CoHostEvent | null> => {
  const named = readEventReference(reference);
  if (!named) return null;
  if (named.kind === 'id') return readCoHostEventById(db, named.eventId);
  const market = await getMarketBySlug(db, named.marketSlug);
  return market
    ? readCoHostEventByAddress(db, {
        marketCode: market.code,
        slug: named.slug,
      })
    : null;
};

const eventNotFound = () =>
  err(new AppError('event_not_found', 'No event matches this reference'));

/** An event's organisers and the organisations that could co-host it, for an operator (B-EVT-20). */
export const eventCoHostsResolver = async (
  db: Db,
  reference: string,
): Promise<Result<EventCoHosts>> => {
  const event = await findEvent(db, reference);
  if (!event) return eventNotFound();
  const choices = await listEventCoHostChoices(db, event);
  return ok({ event, ...choices });
};

/**
 * Add an approved organisation of the event's market as a co-host, audited. Whatever refused it is
 * read back after the write, so the answer names the reason: no such event, an organisation that is
 * not approved or not in the event's market, or one the event already names.
 */
export const addEventCoHostResolver = async (
  db: Db,
  input: { readonly eventId: string; readonly organisationId: string },
  operator: CoHostOperator,
): Promise<Result<EventCoHosts>> => {
  const added = await addEventCoHost(db, {
    ...input,
    audit: { id: id('aud'), ...operator },
  });
  const event = await readCoHostEventById(db, input.eventId);
  if (!event) return eventNotFound();
  const choices = await listEventCoHostChoices(db, event);
  if (!added) {
    if (
      choices.organisers.some(
        (organiser) => organiser.organisationId === input.organisationId,
      )
    )
      return err(
        new AppError(
          'organisation_already_organiser',
          'The event already names this organisation',
        ),
      );
    return err(
      new AppError(
        'organisation_not_approved',
        'Only an approved organisation of the event’s market can co-host it',
      ),
    );
  }
  logger.info('event.co_host_added', {
    eventId: input.eventId,
    organisationId: input.organisationId,
    market: event.marketCode,
  });
  return ok({ event, ...choices });
};

/** Take a co-host off an event, audited; the lead organisation cannot be taken off here. */
export const removeEventCoHostResolver = async (
  db: Db,
  input: { readonly eventId: string; readonly organisationId: string },
  operator: CoHostOperator,
): Promise<Result<EventCoHosts>> => {
  const removed = await removeEventCoHost(db, {
    ...input,
    audit: { id: id('aud'), ...operator },
  });
  const event = await readCoHostEventById(db, input.eventId);
  if (!event) return eventNotFound();
  if (!removed)
    return err(
      new AppError(
        'organisation_not_co_host',
        'This organisation is not a co-host of the event',
      ),
    );
  logger.info('event.co_host_removed', {
    eventId: input.eventId,
    organisationId: input.organisationId,
    market: event.marketCode,
  });
  return ok({ event, ...(await listEventCoHostChoices(db, event)) });
};
