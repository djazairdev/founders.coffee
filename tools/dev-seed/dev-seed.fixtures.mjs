import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { expect } from 'vitest';

import { seedStatements } from './statements.mjs';

const MIGRATIONS = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  'libs/db/migrations',
);

/**
 * A database built by the migrations themselves, not by a copy of the schema.
 *
 * Every statement the product has ever run against D1 runs here in order, so a column added,
 * dropped or made `NOT NULL` reaches this test the same day it reaches the database. A fixture
 * holding its own `CREATE TABLE` would instead keep agreeing with a schema that no longer exists.
 * Foreign keys stay off while the migrations run — several rebuild a table by copying it — and go
 * on before the seed, which is the part whose references are under test.
 *
 * @returns {DatabaseSync} an in-memory database at the current schema.
 */
export const migrated = () => {
  const db = new DatabaseSync(':memory:');
  const files = readdirSync(MIGRATIONS)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  expect(files.length, 'no migrations were found to apply').toBeGreaterThan(0);

  for (const file of files)
    for (const statement of readFileSync(
      path.join(MIGRATIONS, file),
      'utf8',
    ).split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed !== '') db.exec(trimmed);
    }

  db.exec('PRAGMA foreign_keys = ON');
  return db;
};

export const seeded = (now = 1_800_000_000) => {
  const db = migrated();
  for (const statement of seedStatements(now)) db.exec(statement);
  return db;
};

export const rows = (db, sql) => db.prepare(sql).all();
export const count = (db, table) =>
  db.prepare(`select count(*) as n from "${table}"`).get().n;
