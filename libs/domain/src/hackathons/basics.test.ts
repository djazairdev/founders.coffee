import { describe, expect, it } from 'vitest';

import {
  HACKATHON_DESCRIPTION_MAX_LENGTH,
  hackathonBasicsSchema,
} from './basics.js';

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
  hackathonFields: ['artificial_intelligence'],
  hackathonTypeTags: ['open_topics'],
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

  it('accepts descriptions up to 20,000 characters', () => {
    expect(
      pathsOf(
        basics({
          description: 'x'.repeat(HACKATHON_DESCRIPTION_MAX_LENGTH),
        }),
      ),
    ).toEqual([]);
    expect(
      pathsOf(
        basics({
          description: 'x'.repeat(HACKATHON_DESCRIPTION_MAX_LENGTH + 1),
        }),
      ),
    ).toContain('description');
  });

  it('accepts up to five distinct areas and the available hackathon tags', () => {
    expect(
      pathsOf(
        basics({
          hackathonFields: [
            'artificial_intelligence',
            'software_development',
            'cybersecurity',
            'web_development',
            'mobile_apps',
          ],
          hackathonTypeTags: ['open_topics', 'beginner_friendly'],
        }),
      ),
    ).toEqual([]);
    expect(
      pathsOf(
        basics({
          hackathonFields: [
            'artificial_intelligence',
            'software_development',
            'cybersecurity',
            'web_development',
            'mobile_apps',
            'robotics',
          ],
        }),
      ),
    ).toContain('hackathonFields');
    expect(
      pathsOf(basics({ hackathonTypeTags: ['beginner_friendly', 'invalid'] })),
    ).toContain('hackathonTypeTags.1');
  });

  it('requires at least one area and one hackathon tag', () => {
    expect(pathsOf(basics({ hackathonFields: [] }))).toContain(
      'hackathonFields',
    );
    expect(pathsOf(basics({ hackathonTypeTags: [] }))).toContain(
      'hackathonTypeTags',
    );
  });

  it('runs from kickoff to demo day for up to fourteen days, and no longer', () => {
    expect(pathsOf(basics({ endsAt: kickoff + 14 * DAY }))).toEqual([]);
    expect(pathsOf(basics({ endsAt: kickoff + 15 * DAY }))).toContain('endsAt');
  });

  it('allows an online hackathon without an external link, venue, or city', () => {
    const online = {
      format: 'online',
      meetingUrl: 'https://meet.example.com/builders',
      venueName: undefined,
      venueAddress: undefined,
      latitude: undefined,
      longitude: undefined,
    };

    expect(pathsOf(basics(online))).toEqual([]);
    expect(pathsOf(basics({ ...online, meetingUrl: undefined }))).toEqual([]);
    expect(pathsOf(basics({ ...online, cityCode: undefined }))).toEqual([]);
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
