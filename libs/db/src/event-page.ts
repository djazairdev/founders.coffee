import { and, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';

import type { Db } from './db.js';
import { eventOrganisationsQuery } from './event-organisers.js';
import { acceptedHackathonJudgesQuery } from './hackathon-judges.js';
import {
  publicHackathonPrizesOf,
  publicHackathonPrizesQuery,
} from './hackathon-prizes.js';
import { publicHackathonTracksQuery } from './hackathon-tracks.js';
import { memberProfileQuery, profileIdentityQuery } from './member-profiles.js';
import { attendedMeetupsQuery, hostedMeetupsQuery } from './member-record.js';
import { visibleHost } from './profile-access.js';
import { events, hackathons } from './schema.js';

/**
 * A meetup found by its address, and every row its host's card is made from, in one trip to D1.
 *
 * The page used to read the meetup, then check its host, then read the host's identity and
 * profile, then count the host's record: four trips one after another, each of them a round trip
 * from wherever the Worker runs to the database's region (#114). Here the host's reads name the
 * host by a subquery on the same address instead of by the id the meetup row carries, so none of
 * them waits for that row and every statement goes in one batch.
 *
 * The meetup comes back only while its host may still be shown ({@link visibleHost}), which is the
 * check the page used to make in a trip of its own. Its status is left to the caller. The host's
 * rows are the ones `getProfileIdentity`, `getMemberProfile` and the two record counts read, built
 * by the same functions, so the card cannot drift from the host's public profile. The
 * organisations that run the meetup come back in the same batch, found by the same address, and so
 * do a hackathon's dates (B-HKN-17), `null` for any other kind of event, the judges who accepted
 * (B-JDG-03), and its tracks and confirmed prizes (B-HKN-18), none for a meetup.
 */
export const readEventPageRows = async (
  db: Db,
  marketCode: string,
  slug: string,
  now: Date,
) => {
  const pageEvent = alias(events, 'page_event');
  const atAddress = and(
    eq(pageEvent.marketCode, marketCode),
    eq(pageEvent.slug, slug),
  );
  const hostId = sql`(${db
    .select({ id: pageEvent.hostId })
    .from(pageEvent)
    .where(atAddress)})`;
  const eventId = sql`(${db
    .select({ id: pageEvent.id })
    .from(pageEvent)
    .where(atAddress)})`;
  const [
    eventRows,
    identityRows,
    profileRows,
    hostedRows,
    attendedRows,
    organiserRows,
    hackathonRows,
    judgeRows,
    trackRows,
    prizeRows,
  ] = await db.batch([
    db
      .select()
      .from(events)
      .where(
        and(
          eq(events.marketCode, marketCode),
          eq(events.slug, slug),
          visibleHost(events.hostId),
        ),
      )
      .limit(1),
    profileIdentityQuery(db, hostId),
    memberProfileQuery(db, hostId),
    hostedMeetupsQuery(db, hostId, now),
    attendedMeetupsQuery(db, hostId, now),
    eventOrganisationsQuery(db, eventId),
    db
      .select({
        registrationOpensAt: hackathons.registrationOpensAt,
        registrationClosesAt: hackathons.registrationClosesAt,
        submissionDeadlineAt: hackathons.submissionDeadlineAt,
        judgingEndsAt: hackathons.judgingEndsAt,
      })
      .from(hackathons)
      .where(eq(hackathons.eventId, eventId))
      .limit(1),
    acceptedHackathonJudgesQuery(db, eventId),
    publicHackathonTracksQuery(db, eventId),
    publicHackathonPrizesQuery(db, eventId),
  ]);
  return {
    event: eventRows[0],
    host: {
      identity: identityRows[0] ?? null,
      stored: profileRows[0] ?? null,
      hosted: Number(hostedRows[0]?.total ?? 0),
      attended: Number(attendedRows[0]?.total ?? 0),
    },
    organisers: organiserRows,
    hackathon: hackathonRows[0] ?? null,
    judges: judgeRows,
    tracks: trackRows,
    prizes: publicHackathonPrizesOf(prizeRows),
  };
};
