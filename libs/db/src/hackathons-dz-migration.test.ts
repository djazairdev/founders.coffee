import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { atMigration } from './migrations.fixtures.js';

describe('Algeria hackathons launch migration (real D1)', () => {
  it('enables hackathons in Algeria and preserves all other market flags', async () => {
    const { apply } = await atMigration('0086_enable_hackathons_dz.sql');
    await env.PRIOR_DB.prepare(
      'UPDATE markets SET feature_flags = ? WHERE code = ?',
    )
      .bind(
        JSON.stringify({
          events: true,
          hackathons: false,
          communityOperations: true,
        }),
        'DZ',
      )
      .run();
    const otherMarkets = await env.PRIOR_DB.prepare(
      "SELECT code, feature_flags FROM markets WHERE code != 'DZ' ORDER BY code",
    ).all<{ code: string; feature_flags: string }>();

    await apply();

    const algeria = await env.PRIOR_DB.prepare(
      'SELECT feature_flags FROM markets WHERE code = ?',
    )
      .bind('DZ')
      .first<{ feature_flags: string }>();
    expect(JSON.parse(algeria?.feature_flags ?? '{}')).toEqual({
      events: true,
      hackathons: true,
      communityOperations: true,
    });
    const currentOtherMarkets = await env.PRIOR_DB.prepare(
      "SELECT code, feature_flags FROM markets WHERE code != 'DZ' ORDER BY code",
    ).all<{ code: string; feature_flags: string }>();
    expect(currentOtherMarkets.results).toEqual(otherMarkets.results);
  });
});
