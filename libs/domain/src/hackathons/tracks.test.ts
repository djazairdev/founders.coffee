import { describe, expect, it } from 'vitest';

import {
  HACKATHON_TRACK_LIMIT,
  hackathonTrackSchema,
  hackathonTracksSchema,
  isOpenSourceTrackUrl,
} from './tracks.js';

const brief = 'Build something founders in Algiers need this year.';

const founderProblem = {
  kind: 'founder_problem',
  title: 'Invoices for small shops',
  brief,
};

const openSource = (sourceUrls: string[]) => ({
  kind: 'open_source',
  title: 'Open source with djazair.dev',
  brief,
  sourceUrls,
});

describe('hackathon tracks (B-HKN-03)', () => {
  it('takes each of the three kinds with what it needs', () => {
    expect(hackathonTrackSchema.safeParse(founderProblem).success).toBe(true);
    expect(
      hackathonTrackSchema.safeParse({
        kind: 'partner_technology',
        title: 'Build on a partner API',
        brief,
        partnerName: 'Yassir',
      }).success,
    ).toBe(true);
    expect(
      hackathonTrackSchema.safeParse(
        openSource(['https://github.com/djazairdev/wilayas']),
      ).success,
    ).toBe(true);
  });

  it('asks a partner technology track for its partner, and no other track', () => {
    expect(
      hackathonTrackSchema.safeParse({
        kind: 'partner_technology',
        title: 'Build on a partner API',
        brief,
      }).success,
    ).toBe(false);
    expect(
      hackathonTrackSchema.safeParse({
        ...founderProblem,
        partnerName: 'Yassir',
      }).success,
    ).toBe(false);
  });

  it('builds an open-source track from at least one link, each once', () => {
    expect(hackathonTrackSchema.safeParse(openSource([])).success).toBe(false);
    const issue = 'https://github.com/djazairdev/detent/issues/13';
    expect(
      hackathonTrackSchema.safeParse(openSource([issue, issue])).success,
    ).toBe(false);
    expect(
      hackathonTrackSchema.safeParse({
        ...founderProblem,
        sourceUrls: [issue],
      }).success,
    ).toBe(false);
  });

  it('accepts repositories, their issues and Hub pages as sources', () => {
    for (const url of [
      'https://github.com/djazairdev/wilayas',
      'https://github.com/djazairdev/wilayas/',
      'https://github.com/djazairdev/detent/issues/13',
      'https://djazair.dev/en/hub/',
      'https://djazair.dev/ar/hub/?repo=djazairdev/wilayas#issues',
    ])
      expect(isOpenSourceTrackUrl(url), url).toBe(true);
  });

  it('refuses any other link', () => {
    for (const url of [
      'http://github.com/djazairdev/wilayas',
      'https://user:secret@github.com/djazairdev/wilayas',
      'https://github.com/djazairdev',
      'https://github.com/djazairdev/wilayas/pull/21',
      'https://github.com/djazairdev/detent/issues/0',
      'https://gitlab.com/djazairdev/wilayas',
      'https://djazair.dev/en/index/',
      'https://djazair.dev/de/hub/',
      'https://github.com.evil.example/djazairdev/wilayas',
      'not a link',
    ])
      expect(isOpenSourceTrackUrl(url), url).toBe(false);
  });

  it('holds a hackathon to between one and ten tracks', () => {
    expect(hackathonTracksSchema.safeParse([]).success).toBe(false);
    expect(hackathonTracksSchema.safeParse([founderProblem]).success).toBe(
      true,
    );
    expect(
      hackathonTracksSchema.safeParse(
        Array.from({ length: HACKATHON_TRACK_LIMIT + 1 }, () => founderProblem),
      ).success,
    ).toBe(false);
  });

  it('refuses an unknown kind, a short title or brief, and unknown fields', () => {
    expect(
      hackathonTrackSchema.safeParse({ ...founderProblem, kind: 'sponsored' })
        .success,
    ).toBe(false);
    expect(
      hackathonTrackSchema.safeParse({ ...founderProblem, title: 'AI' })
        .success,
    ).toBe(false);
    expect(
      hackathonTrackSchema.safeParse({ ...founderProblem, brief: 'Short.' })
        .success,
    ).toBe(false);
    expect(
      hackathonTrackSchema.safeParse({ ...founderProblem, position: 2 })
        .success,
    ).toBe(false);
  });
});
