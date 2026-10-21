import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { id, type AuditAction, type AuditTarget } from '@founders-coffee/core';

import type { Db } from './db.js';
import { auditStatement, listAuditForTarget } from './operations-audit.js';
import { markets } from './schema.js';
import { HOST_ID, setupDb } from './operations.fixtures.js';

const DECISIONS: readonly (readonly [AuditTarget, AuditAction])[] = [
  ['organisation', 'approved'],
  ['organisation', 'rejected'],
  ['organisation', 'suspended'],
  ['hackathon', 'approved'],
  ['hackathon', 'rejected'],
  ['hackathon', 'suspended'],
  ['judge', 'recused'],
  ['submission', 'disqualified'],
  ['hackathon', 'results_published'],
];

const record = (db: Db, targetType: AuditTarget, action: AuditAction) => {
  const targetId = id('tgt');
  return db
    .batch([
      auditStatement(
        db,
        {
          id: id('aud'),
          actorUserId: HOST_ID,
          accessSubject: null,
          action,
          targetType,
          targetId,
          reasonCode: null,
          metadata: { stage: 'B' },
        },
        markets,
        markets.code,
        eq(markets.code, 'DZ'),
      ),
    ])
    .then(() => targetId);
};

describe('the audit trail for Stage B decisions', () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupDb();
  });

  it.each(DECISIONS)(
    'writes and reads back %s %s',
    async (targetType, action) => {
      const targetId = await record(db, targetType, action);

      const trail = await listAuditForTarget(db, {
        targetType,
        targetId,
        limit: 10,
      });

      expect(trail).toHaveLength(1);
      expect(trail[0]).toMatchObject({
        marketCode: 'DZ',
        actorUserId: HOST_ID,
        action,
        targetType,
        targetId,
        metadata: { stage: 'B' },
      });
    },
  );

  it('keeps one target’s trail apart from another with the same id', async () => {
    const targetId = await record(db, 'organisation', 'approved');
    const trail = await listAuditForTarget(db, {
      targetType: 'hackathon',
      targetId,
      limit: 10,
    });

    expect(trail).toEqual([]);
  });
});
