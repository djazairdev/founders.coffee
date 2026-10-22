import { describe, expect, it } from 'vitest';
import { getTableColumns, is } from 'drizzle-orm';
import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core';

import { hackathonErasure } from './account-closure-hackathons.js';
import { eraseClosedAccount } from './account-closure.js';
import * as schema from './schema.js';

const ERASED: readonly string[] = [
  'session.user_id',
  'account.user_id',
  'scheduled_notifications.user_id',
  'push_subscriptions.user_id',
  'profile_assets.user_id',
  'member_profiles.user_id',
  'account_preferences.user_id',
  'push_session_links.user_id',
  'event_feedback.user_id',
  'chat_messages.author_id',
  'chat_members.user_id',
  'member.user_id',
  'hackathon_registrations.user_id',
];

const KEPT: Readonly<Record<string, string>> = {
  'events.host_id':
    'A host’s published meetups keep their page and every attendee’s history; the tombstone stands in for the host (#105).',
  'event_rsvps.user_id':
    'The member’s RSVPs stay for their 24 months, as the privacy policy says, against the tombstone.',
  'orders.payer_user_id':
    'Dormant payments: the plan says orders and invoices are untouched until payments open, and that must change first.',
  'event_closeouts.submitted_by_user_id':
    'The record of whether a gathering happened stays; it names the tombstone, never the person.',
  'event_closeouts.updated_by_user_id':
    'As above: a correction to a closeout stays as evidence of the record’s history.',
  'event_attendance.user_id':
    'Attendance stays for its 24 months, as the policy says, against the tombstone.',
  'event_attendance.recorded_by_user_id':
    'Who recorded attendance is the host’s audit trail; it stays, pointing at the tombstone.',
  'host_trust.user_id':
    'A trust decision about a host is operations evidence and stays with the operations retention.',
  'host_trust.reviewed_by_user_id':
    'The moderator who decided stays named in the decision, as the append-only audit requires.',
  'operations_audit.actor_user_id':
    'The operations audit is append-only (CO-09): nothing in it is edited or deleted.',
  'operations_reviews.owner_user_id':
    'An operations review is an operator’s working record, kept with its retention.',
  'operations_reviews.created_by_user_id':
    'As above: who opened the review stays with it.',
  'chat_messages.removed_by':
    'Who removed someone else’s message is moderation evidence, kept with the report.',
  'chat_reports.reporter_id':
    'A report stays until its retention runs out (CH-09); the reporter is the tombstone.',
  'chat_reports.reported_user_id':
    'A report about the member stays until its retention runs out (CH-09).',
  'chat_reports.reviewed_by':
    'The moderator who decided a report stays named in the decision.',
  'hackathon_team_invites.created_by':
    'An invite link belongs to its team; one the member made stays with the team, from the tombstone, until it expires or is revoked.',
  'hackathon_submission_versions.submitted_by':
    'A submitted snapshot is the team’s record of what judges saw; who pressed submit stays with it, as the tombstone.',
  'invitation.inviter_id':
    'An invitation belongs to its organisation; one the member sent stays, from the tombstone, until it is answered or expires.',
};

const tables = (): SQLiteTable[] =>
  Object.values(schema).filter((value): value is SQLiteTable =>
    is(value, SQLiteTable),
  );

const userReferences = (): string[] =>
  tables()
    .flatMap((table) => {
      const config = getTableConfig(table);
      return config.foreignKeys
        .map((key) => key.reference())
        .filter(
          (reference) => getTableConfig(reference.foreignTable).name === 'user',
        )
        .flatMap((reference) =>
          reference.columns.map((column) => `${config.name}.${column.name}`),
        );
    })
    .sort();

const drizzleNameOf = (reference: string): string => {
  const [tableName, columnName] = reference.split('.');
  for (const [exportName, value] of Object.entries(schema)) {
    if (!is(value, SQLiteTable)) continue;
    if (getTableConfig(value).name !== tableName) continue;
    const key = Object.entries(getTableColumns(value)).find(
      ([, column]) => column.name === columnName,
    )?.[0];
    if (key) return `${exportName}.${key}`;
  }
  throw new Error(`${reference} is not a column of the schema`);
};

describe('account closure covers every table that points at a person', () => {
  it('erases or deliberately keeps every column with a foreign key to user', () => {
    const accounted = new Set([...ERASED, ...Object.keys(KEPT)]);
    const unaccounted = userReferences().filter(
      (reference) => !accounted.has(reference),
    );

    expect(
      unaccounted,
      'Erase these in eraseClosedAccount, or name them in KEPT with the reason they stay',
    ).toEqual([]);
  });

  it('names nothing that no longer points at user', () => {
    const references = new Set(userReferences());
    const stale = [...ERASED, ...Object.keys(KEPT)].filter(
      (reference) => !references.has(reference),
    );

    expect(stale).toEqual([]);
  });

  it('never both erases and keeps the same column', () => {
    expect(ERASED.filter((reference) => reference in KEPT)).toEqual([]);
  });

  it('gives every kept column its reason', () => {
    for (const reason of Object.values(KEPT))
      expect(reason.length).toBeGreaterThan(20);
  });

  it('finds each erased column in the erasure itself', () => {
    const source = [eraseClosedAccount, hackathonErasure]
      .map((step) => step.toString())
      .join('\n');
    const missing = ERASED.filter(
      (reference) => !source.includes(drizzleNameOf(reference)),
    );

    expect(missing).toEqual([]);
  });
});
