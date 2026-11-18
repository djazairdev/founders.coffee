import { sql, type SQL } from 'drizzle-orm';

import type { Db } from './db.js';
import { bound } from './insert-select.js';
import { hackathonPrizeAwards } from './schema.js';

/**
 * The statement that gives each prize to the frozen result holding its place, for the batch that
 * publishes the results (B-PRZ-01). `isIssued` is the batch's check that this publication went ahead.
 */
export const issuePrizeAwardsStatement = (
  db: Db,
  input: {
    readonly awards: readonly {
      readonly prizeId: string;
      readonly submissionId: string;
    }[];
    readonly awardedAt: Date;
    readonly isIssued: SQL;
  },
) =>
  db.insert(hackathonPrizeAwards).select(
    db
      .select({
        prizeId: sql<string>`json_extract(value, '$.prizeId')`.as('prize_id'),
        submissionId: sql<string>`json_extract(value, '$.submissionId')`.as(
          'submission_id',
        ),
        awardedAt: bound(
          Math.floor(input.awardedAt.getTime() / 1000),
          'awarded_at',
        ),
        deliveryStatus: sql<'pending'>`'pending'`.as('delivery_status'),
        deliveredAt: sql<null>`NULL`.as('delivered_at'),
        privateNote: sql<null>`NULL`.as('private_note'),
      })
      .from(sql`json_each(${JSON.stringify(input.awards)})`)
      .where(input.isIssued),
  );
