import { hackathons } from '@founders-coffee/domain';

import type { HackathonDraftView } from './api';
import type { DetailsField } from './hackathon-details-form';

const DATE_FIELDS = [
  'registrationOpensAt',
  'registrationClosesAt',
  'submissionDeadlineAt',
  'judgingEndsAt',
] as const satisfies readonly DetailsField[];

/**
 * The fields an organiser can no longer change (B-HKN-07): once registration is open, the rules
 * people signed up under and every date that has already passed. Places and dates still ahead stay
 * open; the server still holds them to growing and moving later.
 */
export const lockedFieldsOf = (
  draft: HackathonDraftView,
  now: number,
): ReadonlySet<DetailsField> => {
  const { details } = draft;
  if (draft.stage !== 'locked' || !details) return new Set();
  return new Set<DetailsField>([
    ...hackathons.HACKATHON_LOCKED_FIELDS,
    ...DATE_FIELDS.filter((field) => details[field] <= now),
  ]);
};
