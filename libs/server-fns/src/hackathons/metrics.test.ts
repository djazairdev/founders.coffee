import { describe, expect, it, vi } from 'vitest';

import { recordHackathonMetric } from './metrics.js';

const HACKATHON = `evt_${'a'.repeat(32)}`;
const TRACK = `trk_${'b'.repeat(32)}`;

const fakeMetrics = () => ({ trackEvent: vi.fn(), trackCount: vi.fn() });

describe('recordHackathonMetric', () => {
  it('writes the market, the hackathon and nothing about a person', () => {
    const metrics = fakeMetrics();

    recordHackathonMetric(metrics, 'registration_created', {
      marketCode: 'DZ',
      hackathonId: HACKATHON,
    });

    expect(metrics.trackEvent).toHaveBeenCalledExactlyOnceWith(
      'registration_created',
      { market: 'DZ', hackathon: HACKATHON },
    );
  });

  it('adds the track for a submission', () => {
    const metrics = fakeMetrics();

    recordHackathonMetric(metrics, 'submission_submitted', {
      marketCode: 'DZ',
      hackathonId: HACKATHON,
      trackId: TRACK,
    });

    expect(metrics.trackEvent).toHaveBeenCalledWith('submission_submitted', {
      market: 'DZ',
      hackathon: HACKATHON,
      track: TRACK,
    });
  });

  it.each([
    ['a title in place of the hackathon id', 'Build Algeria 2027', undefined],
    ['a team name in place of the track id', HACKATHON, 'Les Lions'],
  ])('refuses %s', (_case, hackathonId, trackId) => {
    const metrics = fakeMetrics();

    recordHackathonMetric(metrics, 'team_created', {
      marketCode: 'DZ',
      hackathonId,
      ...(trackId === undefined ? {} : { trackId }),
    });

    expect(metrics.trackEvent).not.toHaveBeenCalled();
  });

  it('never throws when the dataset fails or is missing', () => {
    const failing = {
      trackEvent: () => {
        throw new Error('metrics unavailable');
      },
      trackCount: vi.fn(),
    };
    const subject = { marketCode: 'DZ', hackathonId: HACKATHON };

    expect(() =>
      recordHackathonMetric(failing, 'results_published', subject),
    ).not.toThrow();
    expect(() =>
      recordHackathonMetric(null, 'results_published', subject),
    ).not.toThrow();
  });
});
