import { env } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';

import { createDb } from '@founders-coffee/db';

import { processHackathonResultsNotices } from './hackathon-results-notices.js';

describe('processHackathonResultsNotices (B-JDG-11)', () => {
  it('stops without requeueing when there is nobody left to tell', async () => {
    const requeue = vi.fn();

    const result = await processHackathonResultsNotices(
      createDb(env.DB),
      {
        kind: 'hackathon_results_notices_due',
        eventId: 'evt_0123456789abcdef0123456789abcdef',
        afterUserId: null,
      },
      { requeue },
    );

    expect(result).toEqual({ ok: true, data: { written: 0 } });
    expect(requeue).not.toHaveBeenCalled();
  });
});
