import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { atMigration, columnNames } from './migrations.fixtures.js';

describe('0066 — the hackathon interest round (real D1)', () => {
  it('records each address’s attempts and indexes the round and the waiting list', async () => {
    const { apply } = await atMigration('0066_hackathon_interest_launch.sql');

    await apply();

    expect(await columnNames('hackathon_interest')).toEqual([
      'id',
      'email',
      'market_code',
      'locale',
      'notified_at',
      'created_at',
      'send_attempts',
      'last_error',
    ]);
    expect(await columnNames('hackathon_interest_launches')).toEqual([
      'id',
      'event_id',
      'market_code',
      'status',
      'completed_at',
      'cancelled_at',
      'created_at',
    ]);
    const indexes = await env.PRIOR_DB.prepare(
      `SELECT name FROM sqlite_master
        WHERE type = 'index' AND sql IS NOT NULL
          AND tbl_name IN ('hackathon_interest', 'hackathon_interest_launches')
        ORDER BY name`,
    ).all<{ name: string }>();
    expect(indexes.results.map((row) => row.name)).toEqual([
      'hackathon_interest_email_market_unique',
      'hackathon_interest_launch_event_unique',
      'hackathon_interest_launch_market_unique',
      'hackathon_interest_launch_pending_index',
      'hackathon_interest_notified_index',
      'hackathon_interest_waiting_index',
    ]);
  });
});
