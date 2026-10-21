import type { OrganisationStatus } from '@founders-coffee/core';
import { organisations } from '@founders-coffee/domain';

export type OrganisationDecision = organisations.OrganisationDecision;

export const REJECTION_NOTE_MIN_LENGTH =
  organisations.ORGANISATION_REJECTION_NOTE_MIN_LENGTH;
export const REVIEW_NOTE_MAX_LENGTH =
  organisations.ORGANISATION_REVIEW_NOTE_MAX_LENGTH;

const DECISIONS_BY_STATUS: Record<
  OrganisationStatus,
  readonly OrganisationDecision[]
> = {
  pending: ['approve', 'reject'],
  approved: ['suspend'],
  suspended: ['reinstate'],
  rejected: [],
};

/** The decisions an operator can take on an organisation in `status`, in the order they are offered. */
export const decisionsFor = (
  status: OrganisationStatus,
): readonly OrganisationDecision[] => DECISIONS_BY_STATUS[status];

/**
 * The decision the server will accept, read through the same schema it validates with, or `null`
 * when the note does not do for that decision (a rejection needs one).
 */
export const decisionRequest = (
  decision: OrganisationDecision,
  note: string,
): organisations.OrganisationDecisionInput | null => {
  const parsed = organisations.organisationDecisionSchema.safeParse({
    decision,
    note,
  });
  return parsed.success ? parsed.data : null;
};
