import type { HackathonDraftView } from './api';

export const KICKOFF = Date.UTC(2099, 2, 12, 8, 0);
export const DEMO_DAY = Date.UTC(2099, 2, 14, 17, 0);

export const draftView = (
  changes: Partial<HackathonDraftView> = {},
  event: Partial<HackathonDraftView['event']> = {},
): HackathonDraftView => ({
  event: {
    id: 'evt_draft',
    title: 'Algiers Builders Weekend',
    marketCode: 'DZ',
    cityCode: '1',
    startsAt: KICKOFF,
    endsAt: DEMO_DAY,
    format: 'online',
    status: 'draft',
    ...event,
  },
  organisation: {
    id: 'org_1',
    name: 'Oran Makers',
    slug: 'oran-makers',
  },
  version: 1,
  stage: 'open',
  isEditable: true,
  review: {
    status: 'draft',
    note: null,
    gaps: ['details', 'tracks', 'rubric'],
  },
  details: null,
  tracks: [],
  prizes: [],
  criteria: [],
  ...changes,
});

export const savedDetails: NonNullable<HackathonDraftView['details']> = {
  rules: 'Build something new during the weekend.',
  minimumAge: 18,
  attendanceModes: ['online'],
  teamMin: 2,
  teamMax: 5,
  capacity: null,
  registrationOpensAt: Date.UTC(2099, 1, 1, 8, 0),
  registrationClosesAt: Date.UTC(2099, 2, 10, 21, 0),
  submissionDeadlineAt: Date.UTC(2099, 2, 14, 12, 0),
  judgingEndsAt: Date.UTC(2099, 2, 21, 17, 0),
  aiPolicy: 'disclosed',
  aiPolicyNote: null,
  licenceNote: 'Teams keep what they build.',
};
