import type { OrganisationRoster } from './types';

export const markets = [
  {
    code: 'DZ',
    slug: 'algeria',
    name: 'Algeria',
    nameAr: 'الجزائر',
    nameFr: 'Algérie',
    timezone: 'Africa/Algiers',
  },
];

export const ownerView: OrganisationRoster = {
  id: 'org_1',
  name: 'Oran Makers',
  slug: 'oran-makers',
  marketCode: 'DZ',
  cityCode: '31',
  role: 'owner',
  review: {
    status: 'approved',
    approvedAt: new Date('2026-10-01T09:00:00Z'),
  },
  canManage: true,
  canCreateHackathon: true,
  hackathons: [],
  members: [
    {
      memberId: 'mem_owner',
      name: 'Amina Kaci',
      role: 'owner',
      joinedAt: new Date('2026-09-20T09:00:00Z'),
      isYou: true,
      canRemove: false,
    },
    {
      memberId: 'mem_admin',
      name: 'Yacine Bel',
      role: 'admin',
      joinedAt: new Date('2026-10-03T09:00:00Z'),
      isYou: false,
      canRemove: true,
    },
  ],
  invitations: [
    {
      id: 'inv_waiting',
      email: 'waiting@example.org',
      role: 'member',
      expiresAt: new Date('2099-10-29T09:00:00Z'),
      isExpired: false,
    },
    {
      id: 'inv_lapsed',
      email: 'lapsed@example.org',
      role: 'admin',
      expiresAt: new Date('2026-10-05T09:00:00Z'),
      isExpired: true,
    },
  ],
};

export const viewWith = (
  changes: Partial<OrganisationRoster>,
): OrganisationRoster => ({ ...ownerView, ...changes });
