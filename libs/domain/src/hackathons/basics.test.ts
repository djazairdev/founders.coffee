import { describe, expect, it } from 'vitest';

import { hackathonBasicsSchema } from './basics.js';

const DAY = 86_400_000;
const kickoff = Date.now() + 30 * DAY;

const basics = (overrides: Record<string, unknown> = {}) => ({
  marketCode: 'DZ',
  cityCode: '1',
  title: 'Algiers Builders Hackathon',
  description: 'Two days of building with founders across Algiers.',
  venueName: 'Sylabs',
  venueAddress: '12 Rue Didouche Mourad, Alger',
  latitude: 36.7538,
  longitude: 3.0588,
  startsAt: kickoff,
  endsAt: kickoff + 2 * DAY,
  languages: ['ar', 'fr'],
  ...overrides,
});

const pathsOf = (input: Record<string, unknown>) =>
  (hackathonBasicsSchema.safeParse(input).error?.issues ?? []).map((issue) =>
    issue.path.join('.'),
  );

describe("a hackathon's basics (B-HKN-11)", () => {
  it('takes the event alone, with no timeline, team size or AI policy', () => {
    const parsed = hackathonBasicsSchema.parse(basics());

    expect(parsed.format).toBe('in_person');
    expect(parsed.tags).toEqual([]);
  });

  it('runs from kickoff to demo day for up to fourteen days, and no longer', () => {
    expect(pathsOf(basics({ endsAt: kickoff + 14 * DAY }))).toEqual([]);
    expect(pathsOf(basics({ endsAt: kickoff + 15 * DAY }))).toContain('endsAt');
  });

  it('holds an online hackathon to a link and a city, and no venue', () => {
    const online = {
      format: 'online',
      meetingUrl: 'https://meet.example.com/builders',
      venueName: undefined,
      venueAddress: undefined,
      latitude: undefined,
      longitude: undefined,
    };

    expect(pathsOf(basics(online))).toEqual([]);
    expect(pathsOf(basics({ ...online, meetingUrl: undefined }))).toContain(
      'meetingUrl',
    );
    expect(pathsOf(basics({ ...online, cityCode: undefined }))).toContain(
      'cityCode',
    );
  });

  it('refuses the fields that belong to the next step', () => {
    expect(
      hackathonBasicsSchema.safeParse(basics({ aiPolicy: 'disclosed' }))
        .success,
    ).toBe(false);
    expect(
      hackathonBasicsSchema.safeParse(basics({ kind: 'hackathon' })).success,
    ).toBe(false);
  });
});
