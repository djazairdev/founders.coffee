import { and, eq, sql } from 'drizzle-orm';

import type { Db } from './db.js';
import { hackathonAtVersion } from './hackathon-edits.js';
import { bound } from './insert-select.js';
import { events, hackathonSectionDrafts } from './schema.js';

export const hackathonSectionDraftWrite = (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly section: 'deadlines' | 'settings';
    readonly value: unknown;
  },
) => {
  const value = JSON.stringify(input.value);
  const select = db
    .select({
      eventId: events.id,
      deadlines: bound(
        input.section === 'deadlines' ? value : null,
        'deadlines',
      ),
      settings: bound(input.section === 'settings' ? value : null, 'settings'),
      updatedAt: sql`unixepoch()`.as('updated_at'),
    })
    .from(events)
    .where(
      and(
        eq(events.id, input.eventId),
        hackathonAtVersion(input.eventId, input.version),
      ),
    );
  const set =
    input.section === 'deadlines'
      ? {
          deadlines: sql`excluded.deadlines`,
          updatedAt: sql`unixepoch()`,
        }
      : {
          settings: sql`excluded.settings`,
          updatedAt: sql`unixepoch()`,
        };
  return db
    .insert(hackathonSectionDrafts)
    .select(select)
    .onConflictDoUpdate({
      target: hackathonSectionDrafts.eventId,
      set,
    })
    .returning({ eventId: hackathonSectionDrafts.eventId });
};

export const hackathonSectionDraftDelete = (
  db: Db,
  input: { readonly eventId: string; readonly version: number },
) =>
  db
    .delete(hackathonSectionDrafts)
    .where(
      and(
        eq(hackathonSectionDrafts.eventId, input.eventId),
        hackathonAtVersion(input.eventId, input.version),
      ),
    )
    .returning({ eventId: hackathonSectionDrafts.eventId });
