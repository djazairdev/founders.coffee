import { describe, expect, it } from 'vitest';

import {
  atMigration,
  columnNames,
  indexNames,
  priorEventRow,
} from './migrations.fixtures.js';

describe('0061 — hackathon teams (real D1)', () => {
  it('adds the four team tables, leaving existing events as they were', async () => {
    const { apply, event } = await atMigration('0061_hackathon_teams.sql');

    await apply();

    expect(await columnNames('hackathon_teams')).toEqual([
      'id',
      'event_id',
      'name',
      'description',
      'looking_for_members',
      'created_at',
      'updated_at',
    ]);
    expect(await columnNames('hackathon_team_members')).toEqual([
      'team_id',
      'event_id',
      'user_id',
      'is_captain',
      'joined_at',
    ]);
    expect(await columnNames('hackathon_team_invites')).toEqual([
      'id',
      'team_id',
      'token_hash',
      'created_by',
      'expires_at',
      'revoked_at',
      'created_at',
    ]);
    expect(await columnNames('hackathon_team_requests')).toEqual([
      'id',
      'team_id',
      'event_id',
      'user_id',
      'status',
      'created_at',
      'decided_at',
    ]);
    expect(await indexNames('hackathon_team_members')).toEqual(
      expect.arrayContaining([
        'hackathon_team_members_event_user_unique',
        'hackathon_team_members_captain_unique',
      ]),
    );
    expect(await indexNames('hackathon_team_requests')).toContain(
      'hackathon_team_requests_pending_unique',
    );
    expect(await priorEventRow(event.id)).toMatchObject({ id: event.id });
  });
});
