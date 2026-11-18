import { describe, expect, it } from 'vitest';

import {
  decideHackathonReview,
  hackathonReviewDecisionSchema,
} from './review.js';

const EVENT_ID = `evt_${'a'.repeat(32)}`;

describe('deciding a review (B-HKN-08)', () => {
  it('approves or rejects a saved draft, including one in the legacy queue', () => {
    expect(decideHackathonReview('draft', 'approve')).toEqual({
      ok: true,
      data: { from: 'draft', to: 'approved', action: 'approved' },
    });
    expect(decideHackathonReview('submitted', 'approve')).toEqual({
      ok: true,
      data: { from: 'submitted', to: 'approved', action: 'approved' },
    });
    expect(decideHackathonReview('submitted', 'reject')).toEqual({
      ok: true,
      data: { from: 'submitted', to: 'rejected', action: 'rejected' },
    });
    expect(decideHackathonReview('rejected', 'approve').ok).toBe(false);
    expect(decideHackathonReview('approved', 'reject').ok).toBe(false);
  });

  it('asks a rejection for a note the organisers can act on', () => {
    expect(
      hackathonReviewDecisionSchema.safeParse({
        eventId: EVENT_ID,
        version: 1,
        decision: 'reject',
        note: 'Too short',
      }).success,
    ).toBe(false);
    expect(
      hackathonReviewDecisionSchema.parse({
        eventId: EVENT_ID,
        version: 1,
        decision: 'approve',
        note: '  ',
      }),
    ).toEqual({
      eventId: EVENT_ID,
      version: 1,
      decision: 'approve',
      note: undefined,
    });
  });
});
