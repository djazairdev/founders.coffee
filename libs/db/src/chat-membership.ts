import { sql, type SQL } from 'drizzle-orm';

import { activeProfileIdentity, visibleHost } from './profile-access.js';
import {
  eventOrganisers,
  eventRsvps,
  events,
  hackathonJudges,
  hackathonMentors,
  hackathonRegistrations,
  markets,
  member,
  user,
} from './schema.js';

const isFlagOn = (): SQL =>
  sql`json_type(${markets.featureFlags}, '$.meetupChat') = 'true'`;

/**
 * Whether the market of the meetup in the statement's `events` row has switched its chats on: its
 * `meetupChat` flag is JSON `true`, and nothing else is.
 *
 * {@link isChatMember} asks it for every read, write and socket, and a notice about the meetup asks
 * it before it is written, so a market that has not opened its chats has nothing written to them.
 */
export const isChatSwitchedOn = (): SQL => sql`EXISTS (
    SELECT 1 FROM ${markets}
    WHERE ${markets.code} = ${events.marketCode}
      AND ${isFlagOn()}
  )`;

/**
 * Whether any market has switched its chats on, by the same flag {@link isChatSwitchedOn} reads.
 *
 * An account belongs to no market, so what only matters once a chat can exist, such as the chat's
 * row in the notification settings, waits for the first market to open its chats.
 */
export const isChatSwitchedOnAnywhere = (): SQL =>
  sql`EXISTS (SELECT 1 FROM ${markets} WHERE ${isFlagOn()})`;

/**
 * Whether `userId` takes part in the hackathon in the statement's `events` row (B-HKN-22): a member
 * of an organisation that organises it, a participant whose registration stands (not waitlisted,
 * withdrawn or disqualified), or a judge or mentor who accepted.
 */
const isHackathonParticipant = (userId: string | SQL): SQL => sql`(
  EXISTS (
    SELECT 1 FROM ${eventOrganisers}
    JOIN ${member} ON ${member.organizationId} = ${eventOrganisers.organisationId}
    WHERE ${eventOrganisers.eventId} = ${events.id} AND ${member.userId} = ${userId}
  )
  OR EXISTS (
    SELECT 1 FROM ${hackathonRegistrations}
    WHERE ${hackathonRegistrations.eventId} = ${events.id}
      AND ${hackathonRegistrations.userId} = ${userId}
      AND ${hackathonRegistrations.status} = 'registered'
  )
  OR EXISTS (
    SELECT 1 FROM ${hackathonJudges}
    WHERE ${hackathonJudges.eventId} = ${events.id}
      AND ${hackathonJudges.userId} = ${userId}
      AND ${hackathonJudges.status} = 'accepted'
  )
  OR EXISTS (
    SELECT 1 FROM ${hackathonMentors}
    WHERE ${hackathonMentors.eventId} = ${events.id}
      AND ${hackathonMentors.userId} = ${userId}
      AND ${hackathonMentors.status} = 'accepted'
  )
)`;

/**
 * Whether `userId` belongs to the chat of the meetup in the statement's `events` row (P1-026).
 *
 * The one rule for every read, write and socket. A member is the meetup's host, by
 * `events.host_id` rather than by the host's own RSVP, which is written best-effort, or has a
 * `going` RSVP for it; nothing is written when someone joins, because the RSVP is the membership,
 * and deleting it on a cancellation is what removes them. Their account must be active and not
 * banned, through {@link activeProfileIdentity}, since the chat does not trust the RSVP for that.
 * And the meetup must still stand by its host, through {@link visibleHost}: a suppressed host takes
 * the chat with the meetup's page, the way the page and the lists already go. A draft has no chat
 * members until it is published, so nothing about it reaches anyone (B-EVT-16). A hackathon has no
 * RSVPs: its chat also admits everyone {@link isHackathonParticipant} names.
 *
 * A chat switched off in its market has no members at all, through {@link isChatSwitchedOn}, so no
 * surface can reach a chat its market has not opened by forgetting to ask, and switching it off
 * closes every chat in the market at once.
 *
 * `userId` may be SQL that yields the id, such as the user of a session read in the same statement.
 */
export const isChatMember = (userId: string | SQL): SQL => sql`(
  ${isChatSwitchedOn()}
  AND (${events.hostId} = ${userId}
    OR EXISTS (
      SELECT 1 FROM ${eventRsvps}
      WHERE ${eventRsvps.eventId} = ${events.id}
        AND ${eventRsvps.userId} = ${userId}
        AND ${eventRsvps.status} = 'going'
    )
    OR (${events.kind} = 'hackathon' AND ${isHackathonParticipant(userId)}))
  AND EXISTS (SELECT 1 FROM ${user} WHERE ${activeProfileIdentity(userId)})
  AND ${visibleHost(events.hostId)}
  AND ${events.status} <> 'draft'
)`;

/**
 * Whether `userId` is among everyone who may belong to the chat of the event in the statement's
 * `events` row: its host, the people going, and for a hackathon everyone
 * {@link isHackathonParticipant} could name. It only narrows who to ask about, through lookups an
 * index answers; {@link isChatMember} still decides. D1 caps a compound select at a few terms, so
 * the hackathon's people are a second list.
 */
export const isChatMemberCandidate = (userId: SQL): SQL => sql`(
  ${userId} in (
    select ${events.hostId}
    union select ${eventRsvps.userId} from ${eventRsvps}
      where ${eventRsvps.eventId} = ${events.id} and ${eventRsvps.status} = 'going'
  )
  or (${events.kind} = 'hackathon' and ${userId} in (
    select ${member.userId} from ${eventOrganisers}
      join ${member} on ${member.organizationId} = ${eventOrganisers.organisationId}
      where ${eventOrganisers.eventId} = ${events.id}
    union select ${hackathonRegistrations.userId} from ${hackathonRegistrations}
      where ${hackathonRegistrations.eventId} = ${events.id} and ${hackathonRegistrations.status} = 'registered'
    union select ${hackathonJudges.userId} from ${hackathonJudges}
      where ${hackathonJudges.eventId} = ${events.id} and ${hackathonJudges.status} = 'accepted'
    union select ${hackathonMentors.userId} from ${hackathonMentors}
      where ${hackathonMentors.eventId} = ${events.id} and ${hackathonMentors.status} = 'accepted'
  ))
)`;
