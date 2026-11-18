import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { atMigration, columnNames } from './migrations.fixtures.js';

describe('0058 — an operator’s decision on an organisation (real D1)', () => {
  it('adds the note and the date, empty on every organisation already there', async () => {
    const { apply } = await atMigration('0058_organisation_review.sql');
    await env.PRIOR_DB.prepare(
      `INSERT INTO organization (id, name, slug, kind, status, market_code, description)
       VALUES ('org_rv', 'Club', 'club-rv', 'club', 'pending', 'DZ', 'A club for the migration test.')
       ON CONFLICT DO NOTHING`,
    ).run();

    await apply();

    expect(await columnNames('organization')).toEqual(
      expect.arrayContaining(['review_note', 'reviewed_at']),
    );
    expect(
      await env.PRIOR_DB.prepare(
        "SELECT status, review_note, reviewed_at FROM organization WHERE id = 'org_rv'",
      ).first(),
    ).toEqual({ status: 'pending', review_note: null, reviewed_at: null });
  });
});
