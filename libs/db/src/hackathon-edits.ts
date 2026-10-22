import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { events, hackathons } from './schema.js';

export type HackathonEditWrite = BatchItem<'sqlite'>;

/**
 * Whether a hackathon is still as its organiser last saw it (B-HKN-07): its event at `version`, not
 * cancelled, and its details not with the reviewers. Every statement of an edit carries it, so an
 * edit built from a stale page, or landing after the hackathon moved on, writes nothing.
 */
export const hackathonAtVersion = (eventId: string, version: number): SQL =>
  sql`EXISTS (SELECT 1 FROM ${events} LEFT JOIN ${hackathons} ON ${hackathons.eventId} = ${events.id} WHERE ${events.id} = ${eventId} AND ${events.kind} = 'hackathon' AND ${events.version} = ${version} AND ${events.status} != 'cancelled' AND coalesce(${hackathons.reviewStatus}, 'draft') != 'submitted')`;

/**
 * Run an edit's writes, then move the event to its next version, in one batch (B-HKN-07).
 *
 * The version moves last and the order is load-bearing: D1 applies a batch in order inside one
 * transaction, so every write sees the version the organiser saw, and a write placed after the bump
 * would see the new one and never land. Each write carries {@link hackathonAtVersion}, so either the
 * hackathon was current and everything lands with the bump, or nothing does. With `isSingleRow`, the
 * bump also needs the one write before it to have changed a row, for an edit whose own condition
 * can fail while the hackathon is current. Returns the new version, or `null` when nothing landed.
 */
export const applyHackathonEdit = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly writes: readonly HackathonEditWrite[];
    readonly isSingleRow?: boolean;
  },
): Promise<number | null> => {
  const next = input.version + 1;
  const results = await batch(db, [
    ...input.writes,
    db
      .update(events)
      .set({ version: next, updatedAt: new Date() })
      .where(
        and(
          eq(events.id, input.eventId),
          hackathonAtVersion(input.eventId, input.version),
          input.isSingleRow ? sql`changes() = 1` : undefined,
        ),
      )
      .returning({ version: events.version }),
  ]);
  const bumped = results.at(-1) as readonly { version: number }[];
  return bumped.length === 1 ? next : null;
};
