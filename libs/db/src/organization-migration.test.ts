import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import {
  atMigration,
  columnNames,
  indexNames,
  priorHost,
} from './migrations.fixtures.js';

describe('0049 — the organisation plugin (real D1)', () => {
  it('adds the plugin tables and keeps every session, with no active organisation', async () => {
    const { suffix, apply } = await atMigration('0049_organization_plugin.sql');
    const sessionId = `ses_org_${suffix}`;
    await env.PRIOR_DB.prepare(
      'INSERT INTO session (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    )
      .bind(sessionId, priorHost.id, `org-token-${suffix}`, 4070908800)
      .run();

    await apply();

    expect(await columnNames('organization')).toEqual([
      'id',
      'name',
      'slug',
      'logo',
      'metadata',
      'kind',
      'status',
      'market_code',
      'city_code',
      'description',
      'website_url',
      'created_at',
    ]);
    expect(await columnNames('member')).toEqual([
      'id',
      'organization_id',
      'user_id',
      'role',
      'created_at',
    ]);
    expect(await columnNames('invitation')).toEqual([
      'id',
      'organization_id',
      'email',
      'role',
      'status',
      'expires_at',
      'inviter_id',
      'created_at',
    ]);
    expect(await indexNames('organization')).toContain(
      'organization_slug_unique',
    );
    expect(await indexNames('member')).toContain(
      'member_organization_user_unique',
    );
    expect(
      await env.PRIOR_DB.prepare(
        'SELECT token, active_organization_id FROM session WHERE id = ?',
      )
        .bind(sessionId)
        .first(),
    ).toEqual({
      token: `org-token-${suffix}`,
      active_organization_id: null,
    });
  });

  it('starts an organisation pending, and removes its members and invitations with it', async () => {
    await env.PRIOR_DB.batch([
      env.PRIOR_DB.prepare(
        `INSERT INTO organization (id, name, slug, kind, market_code, description)
         VALUES ('org_m', 'Club', 'club-m', 'club', 'DZ', 'A club for the migration test.')`,
      ),
      env.PRIOR_DB.prepare(
        `INSERT INTO member (id, organization_id, user_id, role) VALUES ('mem_m', 'org_m', ?, 'owner')`,
      ).bind(priorHost.id),
      env.PRIOR_DB.prepare(
        `INSERT INTO invitation (id, organization_id, email, expires_at, inviter_id)
         VALUES ('inv_m', 'org_m', 'invited@test.coffee', 4070908800, ?)`,
      ).bind(priorHost.id),
    ]);
    expect(
      await env.PRIOR_DB.prepare(
        "SELECT o.status, i.status AS invitation FROM organization o JOIN invitation i ON i.organization_id = o.id WHERE o.id = 'org_m'",
      ).first(),
    ).toEqual({ status: 'pending', invitation: 'pending' });

    await env.PRIOR_DB.prepare(
      "DELETE FROM organization WHERE id = 'org_m'",
    ).run();

    expect(
      await env.PRIOR_DB.prepare(
        "SELECT (SELECT count(*) FROM member WHERE organization_id = 'org_m') AS members, (SELECT count(*) FROM invitation WHERE organization_id = 'org_m') AS invitations",
      ).first(),
    ).toEqual({ members: 0, invitations: 0 });
  });
});
