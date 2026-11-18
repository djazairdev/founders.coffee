import type { JudgeEntryPageView } from './api';
import { EVENT_ID } from './team-page.fixtures';

export const SUBMISSION_ID = 'sub_ledger';
export const IMPACT = 'crt_impact';
export const CRAFT = 'crt_craft';

export const IMPACT_CRITERION = {
  id: IMPACT,
  name: 'Impact',
  description: 'Who it helps.',
  weight: 60,
  scale: 10,
};

export const entryView = (
  changes: Partial<JudgeEntryPageView> = {},
): JudgeEntryPageView => ({
  event: {
    id: EVENT_ID,
    title: 'Algiers Builders Weekend',
    slug: 'algiers-builders-weekend',
    marketCode: 'DZ',
  },
  submissionDeadlineAt: Date.parse('2099-03-14T11:00:00Z'),
  judgingEndsAt: Date.parse('2099-03-21T11:00:00Z'),
  stage: 'judging',
  isJudge: true,
  isRecused: false,
  screenshots: [],
  entry: {
    submissionId: SUBMISSION_ID,
    teamName: 'Byte Club',
    trackId: 'trk_payments',
    trackTitle: 'Payments',
    version: 2,
    title: 'Ledger',
    description: 'A ledger a corner shop keeps on its phone.',
    repositoryUrl: 'https://github.com/byte-club/ledger',
    demoVideoUrl: 'https://videos.example/ledger',
    pullRequestUrls: ['https://github.com/acme/ledger/pull/7'],
    aiTools: ['Copilot'],
    aiStatement: 'We used Copilot for tests only.',
    submittedAt: Date.parse('2099-03-14T10:00:00Z'),
  },
  criteria: [
    IMPACT_CRITERION,
    {
      id: CRAFT,
      name: 'Craft',
      description: 'How well it is built.',
      weight: 40,
      scale: 5,
    },
  ],
  scores: [],
  ...changes,
});
