import { vi } from 'vitest';

import type { TeamPageView } from './api';

export const EVENT_ID = 'evt_0123456789abcdef0123456789abcdef';

export const teamView = (
  changes: Partial<TeamPageView> = {},
  team: Partial<NonNullable<TeamPageView['team']>> | null = {},
): TeamPageView => ({
  event: {
    id: EVENT_ID,
    title: 'Algiers Builders Weekend',
    slug: 'algiers-builders-weekend',
    marketCode: 'DZ',
  },
  submissionDeadlineAt: Date.parse('2099-03-14T11:00:00Z'),
  canChangeTeams: true,
  teamMin: 2,
  teamMax: 4,
  viewerId: 'usr_captain',
  registration: 'registered',
  team:
    team === null
      ? null
      : {
          id: 'tea_byte',
          name: 'Byte Club',
          description: 'Payments for corner shops.',
          isLookingForMembers: true,
          isCaptain: true,
          members: [
            { userId: 'usr_captain', name: 'Amina', isCaptain: true },
            { userId: 'usr_mate', name: 'Karim', isCaptain: false },
          ],
          requests: [
            {
              id: 'treq_1',
              userId: 'usr_asker',
              name: 'Sofiane',
              createdAt: Date.parse('2099-03-01T10:00:00Z'),
            },
          ],
          inviteExpiresAt: null,
          ...team,
        },
  ownRequests: [],
  ...changes,
});

export const mutation = () => ({
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null as unknown,
});

export const markets = [
  {
    code: 'DZ',
    slug: 'algeria',
    name: 'Algeria',
    nameAr: 'الجزائر',
    nameFr: 'Algérie',
    timezone: 'Africa/Algiers',
  },
] as never;
