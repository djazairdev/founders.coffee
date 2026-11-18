import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { atMigration } from './migrations.fixtures.js';

describe('0078 — immediate organiser registration (real D1)', () => {
  it('activates pending registrations without undoing moderation or changing hackathons', async () => {
    const { apply } = await atMigration('0078_organiser_registration.sql');
    for (const status of ['pending', 'approved', 'rejected', 'suspended']) {
      await env.PRIOR_DB.prepare(
        'INSERT INTO organization (id, name, slug, kind, status, market_code, description, review_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          `org_registration_${status}`,
          status,
          `registration-${status}`,
          'club',
          status,
          'DZ',
          'An organiser for migration verification.',
          status === 'suspended' ? 'Moderation decision' : null,
        )
        .run();
    }
    const eventsBefore = await env.PRIOR_DB.prepare(
      'SELECT id, status FROM events ORDER BY id',
    ).all();
    await apply();
    expect(
      (
        await env.PRIOR_DB.prepare(
          'SELECT id, status FROM events ORDER BY id',
        ).all()
      ).results,
    ).toEqual(eventsBefore.results);
    const rows = await env.PRIOR_DB.prepare(
      "SELECT id, status, review_note, reviewed_at FROM organization WHERE id LIKE 'org_registration_%' ORDER BY id",
    ).all();
    expect(rows.results).toEqual([
      {
        id: 'org_registration_approved',
        status: 'approved',
        review_note: null,
        reviewed_at: null,
      },
      {
        id: 'org_registration_pending',
        status: 'approved',
        review_note: null,
        reviewed_at: null,
      },
      {
        id: 'org_registration_rejected',
        status: 'rejected',
        review_note: null,
        reviewed_at: null,
      },
      {
        id: 'org_registration_suspended',
        status: 'suspended',
        review_note: 'Moderation decision',
        reviewed_at: null,
      },
    ]);
  });
});
