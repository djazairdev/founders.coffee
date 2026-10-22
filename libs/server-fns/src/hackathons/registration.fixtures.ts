import { sql } from 'drizzle-orm';

import {
  eq,
  events,
  insertHackathonDetails,
  type Db,
  type HackathonDetails,
} from '@founders-coffee/db';

import { seedEvent } from '../rsvps/resolver.fixtures.js';

const DAY_MS = 86_400_000;

export const setHackathons = (db: Db, value: boolean) =>
  db.run(
    sql`UPDATE markets SET feature_flags = json_set(feature_flags, '$.hackathons', json(${value ? 'true' : 'false'})) WHERE code = 'DZ'`,
  );

/** A published in-person hackathon in Algiers whose registration opened yesterday. */
export const openHackathon = async (
  db: Db,
  details: Partial<HackathonDetails> = {},
  event: Partial<typeof events.$inferInsert> = {},
): Promise<string> => {
  const eventId = await seedEvent(db);
  await db
    .update(events)
    .set({
      kind: 'hackathon',
      endsAt: new Date('2099-01-16T18:00:00Z'),
      ...event,
    })
    .where(eq(events.id, eventId));
  await insertHackathonDetails(db, {
    eventId,
    details: {
      rules: null,
      minimumAge: null,
      attendanceModes: ['in_person'],
      teamMin: 1,
      teamMax: 4,
      capacity: null,
      registrationOpensAt: new Date(Date.now() - DAY_MS),
      registrationClosesAt: new Date('2099-01-10T18:00:00Z'),
      submissionDeadlineAt: new Date('2099-01-16T12:00:00Z'),
      judgingEndsAt: new Date('2099-01-20T18:00:00Z'),
      aiPolicy: 'disclosed',
      aiPolicyNote: null,
      licenceNote: null,
      ...details,
    },
  });
  return eventId;
};
