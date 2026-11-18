import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import {
  atMigration,
  columnNames,
  indexNames,
  priorEventRow,
} from './migrations.fixtures.js';

const GUEST = 'usr_online_migration_guest';

const CASCADING_TABLES = [
  'event_rsvps',
  'scheduled_notifications',
  'event_attendance',
  'event_closeouts',
  'event_feedback',
  'city_waitlist_launches',
  'city_waitlist_notifications',
  'chat_channels',
  'chat_members',
  'chat_messages',
  'event_organisers',
] as const;

const run = (sql: string, ...values: unknown[]) =>
  env.PRIOR_DB.prepare(sql)
    .bind(...values)
    .run();

const seedEverythingAbout = async (eventId: string) => {
  const stamp = Math.floor(Date.now() / 1000);
  await run(
    "INSERT INTO user (id, name, email, email_verified, role) VALUES (?, 'Guest', 'online-migration-guest@test.coffee', 0, 'member')",
    GUEST,
  );
  await run(
    "INSERT INTO organization (id, name, slug, kind, market_code, description) VALUES ('org_online_migration', 'Club', 'club-online-migration', 'club', 'DZ', 'A club that leads the event.')",
  );
  await run(
    "INSERT INTO city_waitlist (id, email, market_code, city_code, locale) VALUES ('wl_online_migration', 'waiting@test.coffee', 'DZ', '1', 'fr')",
  );
  const where = ["'DZ'", "'01'", "'1'"].join(', ');
  const statements = [
    `INSERT INTO event_rsvps (id, event_id, user_id, status) VALUES ('rsvp_om', ?1, '${GUEST}', 'going')`,
    `INSERT INTO scheduled_notifications (id, event_id, user_id, template_key, payload, send_at) VALUES ('ntf_om', ?1, '${GUEST}', 'reminder_24h', '{}', ${stamp})`,
    `INSERT INTO event_attendance (id, event_id, user_id, market_code, state_code, city_code, outcome, recorded_by_user_id) VALUES ('att_om', ?1, '${GUEST}', ${where}, 'attended', 'usr_prior_schema_host')`,
    `INSERT INTO event_closeouts (event_id, market_code, state_code, city_code, outcome, submitted_by_user_id, private_note) VALUES (?1, ${where}, 'held', 'usr_prior_schema_host', 'Kept through the rebuild')`,
    `INSERT INTO event_feedback (id, event_id, user_id, market_code, state_code, city_code, value_rating, would_return, comment) VALUES ('fb_om', ?1, '${GUEST}', ${where}, 5, 1, 'Worth it')`,
    "INSERT INTO city_waitlist_launches (id, event_id, market_code, city_code) VALUES ('wll_om', ?1, 'DZ', '1')",
    "INSERT INTO city_waitlist_notifications (id, launch_id, waitlist_id) VALUES ('wln_om', 'wll_om', 'wl_online_migration')",
    `INSERT INTO chat_channels (id, event_id, market_code, read_only_at, expires_at) VALUES ('chn_om', ?1, 'DZ', ${stamp}, ${stamp})`,
    `INSERT INTO chat_members (channel_id, user_id) VALUES ('chn_om', '${GUEST}')`,
    `INSERT INTO chat_messages (id, channel_id, author_id, body, created_at) VALUES ('msg_om', 'chn_om', '${GUEST}', 'See you there', ${stamp})`,
    "INSERT INTO event_organisers (event_id, organisation_id, role) VALUES (?1, 'org_online_migration', 'lead')",
  ];
  for (const statement of statements)
    await (statement.includes('?1') ? run(statement, eventId) : run(statement));
};

const contentsOf = async (table: string) =>
  (await env.PRIOR_DB.prepare(`SELECT * FROM ${table} ORDER BY 1, 2`).all())
    .results;

describe('0053 — online and hybrid events (real D1)', () => {
  it('rebuilds events with an optional venue and keeps every row that hangs off them', async () => {
    const { apply, event } = await atMigration('0053_online_hybrid_events.sql');
    await seedEverythingAbout(event.id);
    const eventBefore = await priorEventRow(event.id);
    const before = Object.fromEntries(
      await Promise.all(
        CASCADING_TABLES.map(
          async (table) => [table, await contentsOf(table)] as const,
        ),
      ),
    );
    for (const table of CASCADING_TABLES)
      expect(before[table], table).toHaveLength(1);

    await apply();

    for (const table of CASCADING_TABLES)
      expect(await contentsOf(table), table).toEqual(before[table]);
    expect(await priorEventRow(event.id)).toEqual({
      ...eventBefore,
      format: 'in_person',
      meeting_url: null,
    });
    expect(await columnNames('events')).toEqual(
      expect.arrayContaining(['format', 'meeting_url']),
    );
    expect(await indexNames('events')).toEqual(
      expect.arrayContaining([
        'events_market_code_slug_unique',
        'events_host_id_index',
      ]),
    );
    expect(
      (await env.PRIOR_DB.prepare('PRAGMA foreign_key_check').all()).results,
    ).toEqual([]);
    expect(
      (
        await env.PRIOR_DB.prepare(
          "SELECT name FROM sqlite_master WHERE name LIKE '\\_\\_%' ESCAPE '\\'",
        ).all()
      ).results,
    ).toEqual([]);
  });

  it('takes an online event with no venue, and still cascades a deleted event', async () => {
    const { apply, event } = await atMigration('0053_online_hybrid_events.sql');
    await apply();

    await run(
      "UPDATE events SET venue = NULL, format = 'online', meeting_url = 'https://meet.example/abc' WHERE id = ?",
      event.id,
    );
    expect(await priorEventRow(event.id)).toMatchObject({
      venue: null,
      format: 'online',
      meeting_url: 'https://meet.example/abc',
    });

    await run(
      "INSERT INTO event_rsvps (id, event_id, user_id, status) VALUES ('rsvp_om_cascade', ?, 'usr_prior_schema_host', 'going')",
      event.id,
    );
    await run('DELETE FROM events WHERE id = ?', event.id);
    expect(
      await env.PRIOR_DB.prepare(
        "SELECT count(*) AS n FROM event_rsvps WHERE id = 'rsvp_om_cascade'",
      ).first('n'),
    ).toBe(0);
  });
});
