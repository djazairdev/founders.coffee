import { id } from '@founders-coffee/core';

import type { Db } from './db.js';
import {
  hackathonRegistrations,
  hackathonTeamMembers,
  hackathonTeams,
} from './schema.js';

export const register = (
  db: Db,
  eventId: string,
  userId: string,
  status: 'registered' | 'waitlisted' = 'registered',
) =>
  db.insert(hackathonRegistrations).values({
    id: id('reg'),
    eventId,
    userId,
    status,
    attendanceMode: 'online',
    codeOfConductAcceptedAt: new Date('2099-01-05T09:00:00Z'),
    skills: 'TypeScript, product design',
    isLookingForTeam: true,
  });

export const newTeam = async (db: Db, eventId: string, name: string) => {
  const teamId = id('team');
  await db.insert(hackathonTeams).values({ id: teamId, eventId, name });
  return teamId;
};

export const join = (
  db: Db,
  team: { readonly teamId: string; readonly eventId: string },
  userId: string,
  options: { readonly isCaptain?: boolean; readonly joinedAt?: Date } = {},
) =>
  db.insert(hackathonTeamMembers).values({
    ...team,
    userId,
    isCaptain: options.isCaptain ?? false,
    joinedAt: options.joinedAt ?? new Date(),
  });
