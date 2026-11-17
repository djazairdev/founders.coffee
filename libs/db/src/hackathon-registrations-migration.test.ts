import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import {
  atMigration,
  columnNames,
  indexNames,
  priorHost,
} from './migrations.fixtures.js';

const run = (sql: string, ...values: unknown[]) =>
  env.PRIOR_DB.prepare(sql)
    .bind(...values)
    .run();

const priorHackathon = async (eventId: string) => {
  await run(
    `INSERT INTO hackathons (event_id, attendance_modes, team_min, team_max, registration_opens_at,
       registration_closes_at, submission_deadline_at, judging_ends_at, ai_policy)
     VALUES (?, '["online"]', 1, 4, 4000000000, 4000100000, 4000200000, 4000300000, 'disclosed')`,
    eventId,
  );
  await run(
    `INSERT INTO hackathon_tracks (id, event_id, kind, title, brief, position)
     VALUES (?, ?, 'founder_problem', 'Bookings', 'Help a café take bookings.', 0)`,
    `trk_${eventId}`,
    eventId,
  );
};

const registration = (eventId: string, skills: string, userId = priorHost.id) =>
  run(
    `INSERT INTO hackathon_registrations (id, event_id, user_id, attendance_mode, code_of_conduct_accepted_at, skills)
     VALUES (?, ?, ?, 'online', 4000000500, ?)`,
    `reg_${eventId}_${skills.length}`,
    eventId,
    userId,
    skills,
  );

describe('hackathon registration migrations (real D1)', () => {
  it('adds the table and the count in place, keeping every hackathon, track and event', async () => {
    const { apply, event } = await atMigration(
      '0059_hackathon_registrations.sql',
    );
    await priorHackathon(event.id);

    await apply();

    expect(await columnNames('hackathon_registrations')).toEqual([
      'id',
      'event_id',
      'user_id',
      'status',
      'attendance_mode',
      'code_of_conduct_accepted_at',
      'age_attested_at',
      'looking_for_team',
      'skills',
      'created_at',
      'updated_at',
    ]);
    expect(await indexNames('hackathon_registrations')).toEqual(
      expect.arrayContaining([
        'hackathon_registrations_event_user_unique',
        'hackathon_registrations_event_status_index',
        'hackathon_registrations_user_index',
      ]),
    );
    expect(
      await env.PRIOR_DB.prepare(
        'SELECT registered_count FROM hackathons WHERE event_id = ?',
      )
        .bind(event.id)
        .first(),
      'drizzle-kit wrote this as a rebuild that drops hackathons and cascades to its tracks',
    ).toEqual({ registered_count: 0 });
    expect(
      await env.PRIOR_DB.prepare(
        'SELECT count(*) AS n FROM hackathon_tracks WHERE event_id = ?',
      )
        .bind(event.id)
        .first(),
    ).toEqual({ n: 1 });
  });

  it('refuses a negative count, a second registration and skills past 140 characters', async () => {
    const { apply, event } = await atMigration(
      '0059_hackathon_registrations.sql',
    );
    await priorHackathon(event.id);
    await apply();

    await expect(
      run(
        'UPDATE hackathons SET registered_count = -1 WHERE event_id = ?',
        event.id,
      ),
    ).rejects.toThrow(/CHECK/);
    await registration(event.id, 'TypeScript, design');
    await expect(registration(event.id, 'Go')).rejects.toThrow(/UNIQUE/);
    await expect(registration(event.id, 'x'.repeat(141))).rejects.toThrow(
      /CHECK/,
    );
  });

  it('0085 clears legacy consent data and preserves registrations and team records', async () => {
    const { apply, event, suffix } = await atMigration(
      '0085_hackathon_consent_optional.sql',
    );
    await priorHackathon(event.id);
    await registration(event.id, 'TypeScript');
    const teammateId = `usr_team_${suffix}`;
    await run(
      'INSERT INTO user (id, name, email, email_verified, role) VALUES (?, ?, ?, 0, ?)',
      teammateId,
      'Team Member',
      `team-${suffix}@test.coffee`,
      'member',
    );
    await registration(event.id, 'Design', teammateId);
    const teamId = `team_${suffix}`;
    await run(
      'INSERT INTO hackathon_teams (id, event_id, name) VALUES (?, ?, ?)',
      teamId,
      event.id,
      `Team ${suffix}`,
    );
    await run(
      'INSERT INTO hackathon_team_members (team_id, event_id, user_id, is_captain) VALUES (?, ?, ?, 1)',
      teamId,
      event.id,
      priorHost.id,
    );
    const requestId = `request_${suffix}`;
    await run(
      'INSERT INTO hackathon_team_requests (id, team_id, event_id, user_id) VALUES (?, ?, ?, ?)',
      requestId,
      teamId,
      event.id,
      teammateId,
    );

    await apply();

    const columns = await env.PRIOR_DB.prepare(
      "PRAGMA table_info('hackathon_registrations')",
    ).all<{ name: string; notnull: number }>();
    expect(
      columns.results.find(({ name }) => name === 'code_of_conduct_accepted_at')
        ?.notnull,
    ).toBe(0);
    expect(
      await env.PRIOR_DB.prepare(
        'SELECT event_id, user_id, attendance_mode, code_of_conduct_accepted_at, skills FROM hackathon_registrations WHERE event_id = ?',
      )
        .bind(event.id)
        .first(),
    ).toEqual({
      event_id: event.id,
      user_id: priorHost.id,
      attendance_mode: 'online',
      code_of_conduct_accepted_at: null,
      skills: 'TypeScript',
    });
    expect(
      await env.PRIOR_DB.prepare(
        'SELECT team_id, event_id, user_id, is_captain FROM hackathon_team_members WHERE team_id = ?',
      )
        .bind(teamId)
        .first(),
    ).toEqual({
      team_id: teamId,
      event_id: event.id,
      user_id: priorHost.id,
      is_captain: 1,
    });
    expect(
      await env.PRIOR_DB.prepare(
        'SELECT id, team_id, event_id, user_id, status FROM hackathon_team_requests WHERE id = ?',
      )
        .bind(requestId)
        .first(),
    ).toEqual({
      id: requestId,
      team_id: teamId,
      event_id: event.id,
      user_id: teammateId,
      status: 'pending',
    });
  });
});
