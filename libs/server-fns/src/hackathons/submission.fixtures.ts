import { id } from '@founders-coffee/core';
import {
  addHackathonTrack,
  eq,
  events,
  hackathons as hackathonRows,
  type Db,
} from '@founders-coffee/db';

import { openHackathon } from './registration.fixtures.js';
import { registerForHackathonResolver } from './registration.js';
import { createHackathonTeamResolver } from './team-creation.js';
import {
  createTeamInviteResolver,
  joinTeamByInviteResolver,
} from './team-invites.js';

const HOUR = 3_600_000;

/**
 * A hackathon whose captain's team has two members, moved on to building: registration closed two
 * hours ago and kickoff an hour ago.
 */
export const building = async (
  db: Db,
  [captain, member]: readonly [string, string],
) => {
  const eventId = await openHackathon(db);
  for (const userId of [captain, member]) {
    const registered = await registerForHackathonResolver(db, null, {
      eventId,
      userId,
      attendanceMode: 'in_person',
      isAgeAttested: false,
      isLookingForTeam: true,
      skills: null,
    });
    if (!registered.ok) throw registered.error;
  }
  const team = await createHackathonTeamResolver(db, null, {
    eventId,
    userId: captain,
    name: 'Byte Club',
    description: null,
    isLookingForMembers: true,
  });
  if (!team.ok) throw team.error;
  const link = await createTeamInviteResolver(db, { eventId, userId: captain });
  if (!link.ok) throw link.error;
  await joinTeamByInviteResolver(db, {
    token: link.data.token,
    userId: member,
  });
  await db
    .update(hackathonRows)
    .set({ registrationClosesAt: new Date(Date.now() - 2 * HOUR) })
    .where(eq(hackathonRows.eventId, eventId));
  await db
    .update(events)
    .set({ startsAt: new Date(Date.now() - HOUR) })
    .where(eq(events.id, eventId));
  const trackId = id('trk');
  await addHackathonTrack(db, {
    id: trackId,
    eventId,
    track: {
      kind: 'founder_problem',
      title: 'Payments',
      brief: 'Build a tool that a founder in Algiers would use every week.',
      partnerName: null,
      sourceUrls: [],
    },
  });
  return { eventId, teamId: team.data.teamId, trackId };
};
