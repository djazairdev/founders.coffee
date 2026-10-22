import { describe, expect, it } from 'vitest';

import {
  decideHackathonReview,
  decideSubmission,
  hackathonReadinessGaps,
  hackathonReviewDecisionSchema,
} from './review.js';

const EVENT_ID = `evt_${'a'.repeat(32)}`;

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : (result.error?.code ?? null);

describe('readiness for review (B-HKN-08)', () => {
  it('needs details, a track and a rubric whose weights reach 100', () => {
    expect(
      hackathonReadinessGaps({
        hasDetails: true,
        trackCount: 1,
        criterionWeights: [40, 30, 30],
      }),
    ).toEqual([]);
    expect(
      hackathonReadinessGaps({
        hasDetails: false,
        trackCount: 0,
        criterionWeights: [],
      }),
    ).toEqual(['details', 'tracks', 'rubric']);
    expect(
      hackathonReadinessGaps({
        hasDetails: true,
        trackCount: 2,
        criterionWeights: [50, 50],
      }),
    ).toEqual(['rubric']);
    expect(
      hackathonReadinessGaps({
        hasDetails: true,
        trackCount: 2,
        criterionWeights: [40, 30, 20],
      }),
    ).toEqual(['rubric']);
  });
});

describe('sending for review (B-HKN-08)', () => {
  it('sends a complete draft, or one sent back', () => {
    for (const reviewStatus of ['draft', 'rejected'] as const)
      expect(
        codeOf(
          decideSubmission({ eventStatus: 'draft', reviewStatus, gaps: [] }),
        ),
      ).toBeNull();
  });

  it('refuses one already with the reviewers, approved or published', () => {
    for (const [eventStatus, reviewStatus] of [
      ['draft', 'submitted'],
      ['draft', 'approved'],
      ['published', 'approved'],
    ] as const)
      expect(
        codeOf(decideSubmission({ eventStatus, reviewStatus, gaps: [] })),
      ).toBe('hackathon_not_submittable');
  });

  it('names what an incomplete hackathon lacks', () => {
    const result = decideSubmission({
      eventStatus: 'draft',
      reviewStatus: 'draft',
      gaps: ['rubric'],
    });
    expect(result.ok ? null : result.error).toMatchObject({
      code: 'hackathon_incomplete',
      details: { gaps: ['rubric'] },
    });
  });
});

describe('deciding a review (B-HKN-08)', () => {
  it('approves or rejects only a hackathon sent for review', () => {
    expect(decideHackathonReview('submitted', 'approve')).toEqual({
      ok: true,
      data: { from: 'submitted', to: 'approved', action: 'approved' },
    });
    expect(decideHackathonReview('submitted', 'reject')).toEqual({
      ok: true,
      data: { from: 'submitted', to: 'rejected', action: 'rejected' },
    });
    expect(codeOf(decideHackathonReview('draft', 'approve'))).toBe(
      'invalid_hackathon_transition',
    );
    expect(codeOf(decideHackathonReview('approved', 'reject'))).toBe(
      'invalid_hackathon_transition',
    );
  });

  it('asks a rejection for a note the organisers can act on', () => {
    expect(
      hackathonReviewDecisionSchema.safeParse({
        eventId: EVENT_ID,
        decision: 'reject',
        note: 'Too short',
      }).success,
    ).toBe(false);
    expect(
      hackathonReviewDecisionSchema.parse({
        eventId: EVENT_ID,
        decision: 'approve',
        note: '  ',
      }),
    ).toEqual({ eventId: EVENT_ID, decision: 'approve', note: undefined });
  });
});
