import { describe, expect, it } from 'vitest';

import { eventRunBy, type EventOrganiserSummary } from './run-by.js';

const organiser = (
  name: string,
  overrides: Partial<EventOrganiserSummary> = {},
): EventOrganiserSummary => ({
  name,
  slug: name.toLowerCase().replaceAll(/[^a-z0-9]+/gu, '-'),
  kind: 'club',
  role: 'co_host',
  ...overrides,
});

const platform = organiser('founders.coffee', {
  kind: 'platform',
  role: 'lead',
});

describe('who runs an event (B-EVT-19)', () => {
  it('is founders.coffee when the platform leads it', () => {
    expect(eventRunBy([platform])).toEqual({ kind: 'platform' });
  });

  it('stays founders.coffee when the platform leads with co-hosts', () => {
    expect(eventRunBy([organiser('Code Club Alger'), platform])).toEqual({
      kind: 'platform',
    });
  });

  it('is co-hosted by every organisation, the lead first, when more than one organises it', () => {
    expect(
      eventRunBy([
        organiser('GDG Algiers'),
        organiser('Code Club Alger', { role: 'lead' }),
        organiser('USTHB Robotics', { kind: 'university' }),
      ]),
    ).toEqual({
      kind: 'co_hosted',
      organisations: [
        { name: 'Code Club Alger', slug: 'code-club-alger' },
        { name: 'GDG Algiers', slug: 'gdg-algiers' },
        { name: 'USTHB Robotics', slug: 'usthb-robotics' },
      ],
    });
  });

  it('is co-hosted when the platform only co-hosts', () => {
    expect(
      eventRunBy([
        organiser('Code Club Alger', { role: 'lead' }),
        organiser('founders.coffee', { kind: 'platform' }),
      ]),
    ).toEqual({
      kind: 'co_hosted',
      organisations: [
        { name: 'Code Club Alger', slug: 'code-club-alger' },
        { name: 'founders.coffee', slug: 'founders-coffee' },
      ],
    });
  });

  it('is a community event with no organisation', () => {
    expect(eventRunBy([])).toEqual({ kind: 'community' });
  });

  it('is a community event with a single organisation', () => {
    expect(
      eventRunBy([organiser('Code Club Alger', { role: 'lead' })]),
    ).toEqual({ kind: 'community' });
  });
});
