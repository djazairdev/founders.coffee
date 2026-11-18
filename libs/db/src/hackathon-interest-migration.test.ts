import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { atMigration, columnNames } from './migrations.fixtures.js';

describe('0047 — the hackathon interest list (real D1)', () => {
  it('keeps one address per market and indexes the notice for the retention sweep', async () => {
    const { apply } = await atMigration('0047_hackathon_interest.sql');

    await apply();

    expect(await columnNames('hackathon_interest')).toEqual([
      'id',
      'email',
      'market_code',
      'locale',
      'notified_at',
      'created_at',
    ]);
    const insert = (rowId: string) =>
      env.PRIOR_DB.prepare(
        `INSERT INTO hackathon_interest (id, email, market_code, locale)
         VALUES (?, 'someone@interest.test', 'DZ', 'ar')`,
      )
        .bind(rowId)
        .run();
    await insert('hint_first');
    await expect(insert('hint_second')).rejects.toThrow(/UNIQUE/u);
    const indexes = await env.PRIOR_DB.prepare(
      `SELECT name FROM sqlite_master
        WHERE type = 'index' AND tbl_name = 'hackathon_interest' AND sql IS NOT NULL
        ORDER BY name`,
    ).all<{ name: string }>();
    expect(indexes.results.map((row) => row.name)).toEqual([
      'hackathon_interest_email_market_unique',
      'hackathon_interest_notified_index',
    ]);
  });
});
