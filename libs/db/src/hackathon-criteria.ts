import { asc, eq, sql } from 'drizzle-orm';

import type { HackathonCriterionScale } from '@founders-coffee/core';

import type { Db } from './db.js';
import { bound, nextPosition } from './insert-select.js';
import {
  hackathonCriteria,
  hackathons,
  type HackathonCriterion,
} from './schema.js';

export type HackathonCriterionFields = {
  readonly name: string;
  readonly description: string;
  readonly weight: number;
  readonly scale: HackathonCriterionScale;
};

/**
 * Add a criterion to a hackathon's rubric (B-HKN-05) after its last one, selected from the
 * hackathon's own row, so a criterion is written only beside a hackathon that has its details.
 */
export const addHackathonCriterion = (
  db: Db,
  input: {
    readonly id: string;
    readonly eventId: string;
    readonly criterion: HackathonCriterionFields;
  },
) => {
  const { criterion } = input;
  return db.insert(hackathonCriteria).select(
    db
      .select({
        id: bound(input.id, 'id'),
        eventId: hackathons.eventId,
        name: bound(criterion.name, 'name'),
        description: bound(criterion.description, 'description'),
        weight: bound(criterion.weight, 'weight'),
        scale: bound(criterion.scale, 'scale'),
        position: nextPosition(hackathonCriteria, input.eventId),
        createdAt: sql`unixepoch()`.as('created_at'),
        updatedAt: sql`unixepoch()`.as('updated_at'),
      })
      .from(hackathons)
      .where(eq(hackathons.eventId, input.eventId)),
  );
};

/** A hackathon's rubric, in its order. */
export const listHackathonCriteria = (
  db: Db,
  eventId: string,
): Promise<HackathonCriterion[]> =>
  db
    .select()
    .from(hackathonCriteria)
    .where(eq(hackathonCriteria.eventId, eventId))
    .orderBy(asc(hackathonCriteria.position));
