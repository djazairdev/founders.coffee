import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import {
  cancelNotificationsByTemplate,
  communityOperationsEnabled,
  createAdminCloseout,
  getEvent,
  listMarkets,
  listMissingMeetupCloseouts,
  type Db,
} from '@founders-coffee/db';
import type { operations } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { enqueueDidNotHappenNotices } from '../notifications/did-not-happen.js';

export interface MissingCloseoutItem {
  readonly eventId: string;
  readonly title: string;
  readonly marketCode: string;
  readonly endsAt: Date;
  readonly timeZone: string;
}

export interface MissingCloseouts {
  readonly items: readonly MissingCloseoutItem[];
}

const CLOSEOUT_QUEUE_LIMIT = 1000;

export const listMissingCloseoutsResolver = async (
  db: Db,
): Promise<Result<MissingCloseouts>> => {
  const markets = await listMarkets(db);
  const enabledMarkets = await Promise.all(
    markets.map(async (market) =>
      (await communityOperationsEnabled(db, market.code)) ? market : null,
    ),
  );
  const itemsByMarket = await Promise.all(
    enabledMarkets.flatMap((market) =>
      market
        ? [
            listMissingMeetupCloseouts(db, {
              marketCode: market.code,
              now: new Date(),
              limit: CLOSEOUT_QUEUE_LIMIT,
            }).then((rows) =>
              rows.flatMap((row) =>
                row.endsAt
                  ? [
                      {
                        eventId: row.id,
                        title: row.title,
                        marketCode: market.code,
                        endsAt: row.endsAt,
                        timeZone: market.timezone,
                      },
                    ]
                  : [],
              ),
            ),
          ]
        : [],
    ),
  );
  return ok({
    items: itemsByMarket
      .flat()
      .sort((left, right) => left.endsAt.getTime() - right.endsAt.getTime()),
  });
};

export const createMissingCloseoutResolver = async (
  db: Db,
  input: operations.CreateAdminCloseoutInput,
  actor: { readonly actorId: string; readonly accessSubject: string | null },
): Promise<Result<{ eventId: string; outcome: 'held' | 'did_not_happen' }>> => {
  const event = await getEvent(db, input.eventId);
  if (!event || event.status === 'draft')
    return err(new AppError('event_not_found', 'Event not found'));
  if (
    event.kind !== 'meetup' ||
    event.status !== 'published' ||
    !event.endsAt ||
    event.endsAt.getTime() > Date.now()
  )
    return err(
      new AppError('closeout_not_eligible', 'This meetup cannot be closed out'),
    );
  if (!(await communityOperationsEnabled(db, event.marketCode)))
    return err(
      new AppError(
        'operations_disabled',
        'Community operations are not enabled in this market',
      ),
    );

  const created = await createAdminCloseout(db, {
    eventId: input.eventId,
    actorId: actor.actorId,
    accessSubject: actor.accessSubject,
    outcome: input.outcome,
    auditId: id('aud'),
  });
  if (created === 'already_closed')
    return err(
      new AppError(
        'closeout_already_closed',
        'This meetup is already closed out',
      ),
    );
  if (created !== 'created')
    return err(
      new AppError('closeout_not_eligible', 'This meetup cannot be closed out'),
    );

  logger.info('operations.admin_closeout_created', {
    eventId: event.id,
    marketCode: event.marketCode,
    actorId: actor.actorId,
    outcome: input.outcome,
  });

  await cancelNotificationsByTemplate(db, {
    eventId: event.id,
    templateKeys: ['closeout_prompt'],
  });
  if (input.outcome === 'did_not_happen')
    await enqueueDidNotHappenNotices(db, {
      id: event.id,
      hostId: event.hostId,
      marketCode: event.marketCode,
      title: event.title,
      venue: event.venue,
      slug: event.slug,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
    });

  return ok({ eventId: event.id, outcome: input.outcome });
};
