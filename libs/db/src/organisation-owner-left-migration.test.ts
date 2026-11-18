import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { atMigration, columnNames, indexNames } from './migrations.fixtures.js';

describe('0052 — when an organisation’s last owner left (real D1)', () => {
  it('adds the stamp, empty on every organisation already there, with an index for the queue', async () => {
    const { apply } = await atMigration('0052_organisation_owner_left.sql');
    await env.PRIOR_DB.prepare(
      `INSERT INTO organization (id, name, slug, kind, status, market_code, description)
       VALUES ('org_ol', 'Club', 'club-ol', 'club', 'approved', 'DZ', 'A club for the migration test.')
       ON CONFLICT DO NOTHING`,
    ).run();

    await apply();

    expect(await columnNames('organization')).toContain('owner_left_at');
    expect(await indexNames('organization')).toContain(
      'organization_owner_left_index',
    );
    expect(
      await env.PRIOR_DB.prepare(
        "SELECT status, owner_left_at FROM organization WHERE id = 'org_ol'",
      ).first(),
    ).toEqual({ status: 'approved', owner_left_at: null });
  });
});
