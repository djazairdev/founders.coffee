import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { atMigration, columnNames, indexNames } from './migrations.fixtures.js';

describe('0050 — event organisers (real D1)', () => {
  it('adds the table, with one lead per event and a lookup by organisation', async () => {
    const { apply, event } = await atMigration('0050_event_organisers.sql');

    await apply();

    expect(await columnNames('event_organisers')).toEqual([
      'event_id',
      'organisation_id',
      'role',
      'created_at',
    ]);
    expect(await indexNames('event_organisers')).toEqual(
      expect.arrayContaining([
        'event_organisers_one_lead_unique',
        'event_organisers_organisation_index',
      ]),
    );
    expect(
      await env.PRIOR_DB.prepare(
        "SELECT sql FROM sqlite_master WHERE name = 'event_organisers_one_lead_unique'",
      ).first('sql'),
    ).toContain("WHERE role = 'lead'");

    await env.PRIOR_DB.batch([
      env.PRIOR_DB.prepare(
        `INSERT INTO organization (id, name, slug, kind, market_code, description)
         VALUES ('org_eo', 'Club', 'club-eo', 'club', 'DZ', 'A club for the migration test.')`,
      ),
      env.PRIOR_DB.prepare(
        "INSERT INTO event_organisers (event_id, organisation_id, role) VALUES (?, 'org_eo', 'lead')",
      ).bind(event.id),
    ]);
    expect(
      await env.PRIOR_DB.prepare(
        'SELECT role, created_at > 0 AS stamped FROM event_organisers WHERE event_id = ?',
      )
        .bind(event.id)
        .first(),
    ).toEqual({ role: 'lead', stamped: 1 });
  });
});
