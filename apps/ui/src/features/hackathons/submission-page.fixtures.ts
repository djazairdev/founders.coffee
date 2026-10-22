import type { SubmissionPageView } from './api';
import { EVENT_ID } from './team-page.fixtures';

export const TRACK_ID = 'trk_0123456789abcdef0123456789abcdef';
export const OPEN_SOURCE_TRACK_ID = 'trk_fedcba9876543210fedcba9876543210';

export const submissionView = (
  changes: Partial<SubmissionPageView> = {},
  entry: Partial<NonNullable<SubmissionPageView['entry']>> | null = {},
): SubmissionPageView => ({
  event: {
    id: EVENT_ID,
    title: 'Algiers Builders Weekend',
    slug: 'algiers-builders-weekend',
    marketCode: 'DZ',
  },
  kickoffAt: Date.parse('2099-03-13T09:00:00Z'),
  submissionDeadlineAt: Date.parse('2099-03-14T11:00:00Z'),
  stage: 'building',
  aiPolicy: 'disclosed',
  registration: 'registered',
  team: { id: 'tea_byte', name: 'Byte Club', isCaptain: true },
  tracks: [
    { id: TRACK_ID, title: 'Payments', kind: 'founder_problem' },
    { id: OPEN_SOURCE_TRACK_ID, title: 'Open source', kind: 'open_source' },
  ],
  entry:
    entry === null
      ? null
      : {
          id: 'sub_ledger',
          status: 'draft',
          version: 3,
          trackId: TRACK_ID,
          title: 'Ledger',
          description: 'A ledger a corner shop keeps on its phone.',
          repositoryUrl: 'https://github.com/byte-club/ledger',
          demoVideoUrl: null,
          pullRequestUrls: [],
          aiTools: ['Copilot'],
          aiStatement: 'We used Copilot for tests only.',
          submittedAt: null,
          ...entry,
        },
  ...changes,
});
