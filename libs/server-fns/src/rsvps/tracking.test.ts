import { describe, expect, it, vi } from 'vitest';
import { createRsvpResolver } from './resolver.js';
import { HOST_ID, members, seedEvent, setupDb } from './resolver.fixtures.js';

describe('confirmed RSVP tracking (real D1)', () => {
  it('counts only a committed non-host seat, never duplicate or rejected attempts', async () => {
    const db = await setupDb();
    const eventId = await seedEvent(db);
    const trackEvent = vi.fn();
    const metrics = { trackEvent, trackCount: vi.fn() };
    const attribution = {
      source: 'facebook',
      medium: 'paid_social',
      campaign: 'v90_founders_ar_v2',
    };
    expect(
      (
        await createRsvpResolver(db, {
          eventId,
          userId: members[0].id,
          metrics,
          attribution,
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await createRsvpResolver(db, {
          eventId,
          userId: members[0].id,
          metrics,
          attribution,
        })
      ).ok,
    ).toBe(false);
    await createRsvpResolver(db, { eventId, userId: HOST_ID, metrics });
    await createRsvpResolver(db, {
      eventId: 'missing',
      userId: members[0].id,
      metrics,
    });
    expect(trackEvent).toHaveBeenCalledOnce();
    expect(trackEvent).toHaveBeenCalledWith('rsvps_created', {
      market: 'DZ',
      city: '1',
      locale: 'fr',
      attribution,
    });
  });
  it('a metrics outage never rejects a committed RSVP', async () => {
    const db = await setupDb(),
      eventId = await seedEvent(db);
    const metrics = {
      trackEvent: () => {
        throw new Error('metrics unavailable');
      },
      trackCount: vi.fn(),
    };
    expect(
      (
        await createRsvpResolver(db, {
          eventId,
          userId: members[0].id,
          metrics,
        })
      ).ok,
    ).toBe(true);
  });
});
