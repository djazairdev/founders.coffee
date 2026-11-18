import { describe, expect, it } from 'vitest';

import {
  decideDraftReplace,
  decideDraftSave,
  submissionDraftSchema,
} from './submission-drafts.js';

const timeline = {
  registrationOpensAt: Date.parse('2099-01-01T00:00:00Z'),
  registrationClosesAt: Date.parse('2099-01-10T00:00:00Z'),
  kickoffAt: Date.parse('2099-01-15T09:00:00Z'),
  submissionDeadlineAt: Date.parse('2099-01-16T12:00:00Z'),
  endsAt: Date.parse('2099-01-16T18:00:00Z'),
  judgingEndsAt: Date.parse('2099-01-20T18:00:00Z'),
};

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

const captain = { teamId: 'team_a', isCaptain: true };

describe('saving a submission draft (B-SUB-03)', () => {
  it('takes a draft with only a title, and fills the rest as empty', () => {
    expect(submissionDraftSchema.parse({ title: '  Ledger  ' })).toEqual({
      trackId: null,
      title: 'Ledger',
      description: '',
      repositoryUrl: null,
      demoVideoUrl: null,
      pullRequestUrls: [],
      aiTools: [],
      aiStatement: null,
    });
    expect(
      submissionDraftSchema.parse({ title: 'Ledger', aiStatement: '   ' })
        .aiStatement,
    ).toBeNull();
  });

  it('still holds a draft’s links to credential-free HTTPS', () => {
    const takes = (repositoryUrl: string) =>
      submissionDraftSchema.safeParse({ title: 'Ledger', repositoryUrl })
        .success;
    expect(takes('https://github.com/byte-club/ledger')).toBe(true);
    expect(takes('http://github.com/byte-club/ledger')).toBe(false);
    expect(takes('https://user:secret@github.com/byte-club/ledger')).toBe(
      false,
    );
    expect(submissionDraftSchema.safeParse({ title: '   ' }).success).toBe(
      false,
    );
  });

  it('lets only the captain save, and only from kickoff until the deadline', () => {
    const at = (iso: string, membership: typeof captain | null = captain) =>
      codeOf(decideDraftSave({ timeline, now: Date.parse(iso), membership }));
    expect(at('2099-01-15T09:00:00Z')).toBeNull();
    expect(at('2099-01-16T11:59:59Z')).toBeNull();
    expect(at('2099-01-15T08:59:59Z')).toBe('building_not_started');
    expect(at('2099-01-16T12:00:00Z')).toBe('deadline_passed');
    expect(at('2099-01-15T10:00:00Z', { ...captain, isCaptain: false })).toBe(
      'not_team_captain',
    );
    expect(at('2099-01-15T10:00:00Z', null)).toBe('not_team_captain');
  });

  it('keeps a submitted entry complete and a disqualified one as it was', () => {
    const draft = submissionDraftSchema.parse({ title: 'Ledger' });
    const complete = {
      ...draft,
      trackId: `trk_${'a'.repeat(32)}`,
      repositoryUrl: 'https://github.com/byte-club/ledger',
      aiStatement: 'We wrote the code ourselves.',
    };
    expect(codeOf(decideDraftReplace('draft', draft))).toBeNull();
    expect(codeOf(decideDraftReplace('submitted', complete))).toBeNull();
    expect(codeOf(decideDraftReplace('submitted', draft))).toBe(
      'submission_incomplete',
    );
    expect(codeOf(decideDraftReplace('disqualified', complete))).toBe(
      'submission_locked',
    );
  });
});
