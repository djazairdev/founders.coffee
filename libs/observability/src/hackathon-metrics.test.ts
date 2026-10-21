import { describe, expect, it } from 'vitest';

import { HACKATHON_METRICS } from './hackathon-metrics.js';
import { buildDataPoint } from './metrics.js';

const HACKATHON = `evt_${'a'.repeat(32)}`;
const TRACK = `trk_${'b'.repeat(32)}`;

describe('Stage B metric names', () => {
  it('are fixed now, because Stage C reads them', () => {
    expect(HACKATHON_METRICS).toEqual([
      'hackathon_published',
      'registration_created',
      'registration_withdrawn',
      'team_created',
      'submission_submitted',
      'judging_completed',
      'results_published',
    ]);
  });
});

describe('a Stage B data point', () => {
  it('keeps the eight shared columns and adds the hackathon and track', () => {
    expect(
      buildDataPoint('submission_submitted', [1], {
        market: 'DZ',
        environment: 'production',
        hackathon: HACKATHON,
        track: TRACK,
      }),
    ).toEqual({
      indexes: ['DZ'],
      doubles: [1],
      blobs: [
        'submission_submitted',
        '',
        '',
        'production',
        'none',
        'none',
        'none',
        'server',
        HACKATHON,
        TRACK,
      ],
    });
  });

  it('leaves the track empty when the outcome has none', () => {
    expect(
      buildDataPoint('team_created', [1], {
        market: 'DZ',
        environment: 'staging',
        hackathon: HACKATHON,
      }).blobs.slice(8),
    ).toEqual([HACKATHON, '']);
  });

  it('keeps blob9 in place when no environment was given', () => {
    const { blobs } = buildDataPoint('results_published', [1], {
      market: 'DZ',
      hackathon: HACKATHON,
    });

    expect(blobs[3]).toBe('unknown');
    expect(blobs[8]).toBe(HACKATHON);
  });

  it('leaves every earlier row shape unchanged', () => {
    expect(
      buildDataPoint('rsvps_created', [1], { market: 'DZ', city: '1' }).blobs,
    ).toEqual(['rsvps_created', '1', '']);
  });
});
