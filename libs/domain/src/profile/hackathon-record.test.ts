import { describe, expect, it } from 'vitest';

import { hackathonRecordOf } from './hackathon-record.js';

const certificate = (
  eventId: string,
  kind: 'participant' | 'winner' | 'judge',
  placement: string | null = null,
  startsAt = '2027-01-01T00:00:00Z',
) => ({
  eventId,
  title: `Hackathon ${eventId}`,
  slug: `hackathon-${eventId}`,
  marketSlug: 'algeria',
  kind,
  placement,
  verificationCode: `${eventId}-${kind}-${placement ?? 'none'}`,
  startsAt: new Date(startsAt),
});

describe('hackathonRecordOf', () => {
  it('gives one line per hackathon under the strongest certificate, with every placement', () => {
    expect(
      hackathonRecordOf(
        [
          certificate('a', 'participant'),
          certificate('a', 'winner', 'First prize'),
          certificate('a', 'winner', 'Payments · First prize'),
        ],
        [],
      ),
    ).toEqual([
      {
        title: 'Hackathon a',
        slug: 'hackathon-a',
        marketSlug: 'algeria',
        kind: 'winner',
        placements: ['First prize', 'Payments · First prize'],
        certificateCode: 'a-winner-First prize',
        projectSlug: null,
      },
    ]);
  });

  it('puts the newest first and names the project of the right hackathon', () => {
    const record = hackathonRecordOf(
      [
        certificate('old', 'judge', null, '2026-01-01T00:00:00Z'),
        certificate('new', 'participant', null, '2027-06-01T00:00:00Z'),
      ],
      [{ eventId: 'new', slug: 'ledger-ab12' }],
    );

    expect(record.map((entry) => entry.slug)).toEqual([
      'hackathon-new',
      'hackathon-old',
    ]);
    expect(record.map((entry) => entry.projectSlug)).toEqual([
      'ledger-ab12',
      null,
    ]);
    expect(record[1]?.kind).toBe('judge');
  });

  it('is empty for a member who holds no certificate', () => {
    expect(hackathonRecordOf([], [])).toEqual([]);
  });
});
