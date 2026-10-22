import { hackathons } from '@founders-coffee/domain';

export type HackathonDecision = hackathons.HackathonReviewDecision;

export const HACKATHON_DECISIONS: readonly HackathonDecision[] = [
  'approve',
  'reject',
];

export const REJECTION_NOTE_MIN_LENGTH =
  hackathons.HACKATHON_REJECTION_NOTE_MIN_LENGTH;
export const REVIEW_NOTE_MAX_LENGTH =
  hackathons.HACKATHON_REVIEW_NOTE_MAX_LENGTH;

/**
 * The decision the server will accept, read through the same schema it validates with, or `null`
 * when the note does not do for that decision (a rejection needs one).
 */
export const decisionRequest = (
  eventId: string,
  decision: HackathonDecision,
  note: string,
): hackathons.HackathonReviewDecisionInput | null => {
  const parsed = hackathons.hackathonReviewDecisionSchema.safeParse({
    eventId,
    decision,
    note,
  });
  return parsed.success ? parsed.data : null;
};
