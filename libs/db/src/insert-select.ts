import { sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

/** A value bound into an `INSERT … SELECT`, named as the column it fills. */
export const bound = <T>(value: T, column: string) =>
  sql<T>`${value}`.as(column);

/**
 * The position after an event's last row in an ordered table, as one subquery, so rows added in one
 * batch take the next positions in order and a unique `(event_id, position)` index refuses two
 * writers that read the same last position.
 */
export const nextPosition = (
  table: SQLiteTable & {
    readonly eventId: SQLiteColumn;
    readonly position: SQLiteColumn;
  },
  eventId: string,
): SQL.Aliased<number> =>
  sql<number>`(SELECT coalesce(max(${table.position}) + 1, 0) FROM ${table} WHERE ${table.eventId} = ${eventId})`.as(
    'position',
  );
