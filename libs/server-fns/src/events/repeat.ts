import {
  AppError,
  err,
  eventLanguages,
  ok,
  type EventFormat,
  type Result,
  type Topic,
} from '@founders-coffee/core';
import {
  communityOperationsEnabled,
  getCloseout,
  getEvent,
  isEventOrganiser,
  readEventLeadOrganisation,
  type Db,
} from '@founders-coffee/db';
import { events as eventsDomain } from '@founders-coffee/domain';

export interface RepeatEventTemplate {
  readonly sourceEventId: string;
  readonly marketCode: string;
  readonly cityCode: string;
  readonly title: string;
  readonly description: string;
  readonly venue: string | null;
  readonly venueAddress: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly languages: readonly string[];
  readonly kind: eventsDomain.MemberEventKind;
  readonly format: EventFormat;
  readonly meetingUrl: string | null;
  readonly tags: readonly Topic[];
  readonly organisationId: string | null;
}

const ineligible = (): Result<RepeatEventTemplate> =>
  err(
    new AppError(
      'repeat_event_not_eligible',
      'Only a completed gathering can be repeated',
    ),
  );

export const readRepeatEventTemplate = async (
  db: Db,
  opts: { eventId: string; actorId: string },
): Promise<Result<RepeatEventTemplate>> => {
  const event = await getEvent(db, opts.eventId);
  if (!event) return err(new AppError('event_not_found', 'Event not found'));
  const mayRepeat =
    event.hostId === opts.actorId ||
    (await isEventOrganiser(db, { eventId: event.id, userId: opts.actorId }));
  if (!mayRepeat) {
    return err(
      new AppError(
        'repeat_event_not_host',
        'Only the host can repeat this gathering',
      ),
    );
  }
  if (!(await communityOperationsEnabled(db, event.marketCode))) {
    return err(
      new AppError(
        'operations_disabled',
        'Community operations are not enabled in this market',
      ),
    );
  }
  if (
    event.status === 'cancelled' ||
    event.endsAt === null ||
    event.endsAt.getTime() > Date.now() ||
    event.cityCode === null
  ) {
    return ineligible();
  }
  const kind = eventsDomain.memberEventKindSchema.safeParse(event.kind);
  if (!kind.success) return ineligible();
  const [closeout, organisationId] = await Promise.all([
    getCloseout(db, event.id),
    readEventLeadOrganisation(db, event.id),
  ]);
  if (closeout?.outcome !== 'held') return ineligible();

  return ok({
    sourceEventId: event.id,
    marketCode: event.marketCode,
    cityCode: event.cityCode,
    title: event.title,
    description: event.description,
    venue: event.venue,
    venueAddress: event.venueAddress,
    latitude: event.latitude,
    longitude: event.longitude,
    languages: eventLanguages(event),
    kind: kind.data,
    format: event.format,
    meetingUrl: event.meetingUrl,
    tags: event.tags,
    organisationId,
  });
};
