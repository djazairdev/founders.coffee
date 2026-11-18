import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  cascadeClosure,
  findIncompatibleStatements,
} from './migration-rebuild.mjs';

const shippedMigrations = path.join(
  import.meta.dirname,
  '..',
  '..',
  'libs',
  'db',
  'migrations',
);

const references = (tableFrom, tableTo, onDelete) => ({
  [`${tableFrom}_${tableTo}_fk`]: { tableFrom, tableTo, onDelete },
});

const snapshot = (venueNotNull) => ({
  tables: {
    events: {
      name: 'events',
      columns: {
        id: { name: 'id', notNull: true },
        venue: { name: 'venue', notNull: venueNotNull },
      },
      foreignKeys: {},
    },
    rsvps: {
      name: 'rsvps',
      columns: { event_id: { name: 'event_id', notNull: true } },
      foreignKeys: references('rsvps', 'events', 'cascade'),
    },
    reminders: {
      name: 'reminders',
      columns: { rsvp_id: { name: 'rsvp_id', notNull: true } },
      foreignKeys: references('reminders', 'rsvps', 'cascade'),
    },
    reports: {
      name: 'reports',
      columns: { event_id: { name: 'event_id', notNull: false } },
      foreignKeys: references('reports', 'events', 'no action'),
    },
  },
});

const directory = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-cascade-'));
  fs.mkdirSync(path.join(root, 'meta'));
  const write = (file, value) =>
    fs.writeFileSync(path.join(root, 'meta', file), JSON.stringify(value));
  write('_journal.json', {
    entries: [
      { idx: 52, tag: '0052_before' },
      { idx: 53, tag: '0053_rebuild' },
    ],
  });
  write('0052_snapshot.json', snapshot(true));
  write('0053_snapshot.json', snapshot(false));
  return root;
};

const take = (table) =>
  `CREATE TABLE \`__keep_${table}\` AS SELECT * FROM \`${table}\`;`;
const restore = (table) =>
  `INSERT INTO \`${table}\` SELECT * FROM \`__keep_${table}\`;`;
const discard = (table) => `DROP TABLE \`__keep_${table}\`;`;
const rebuild = [
  'CREATE TABLE `__new_events` (`id` text PRIMARY KEY NOT NULL, `venue` text);',
  'INSERT INTO `__new_events` (`id`, `venue`) SELECT `id`, `venue` FROM `events`;',
  'DROP TABLE `events`;',
  'ALTER TABLE `__new_events` RENAME TO `events`;',
];
const check = [
  'CREATE TABLE `__fk_check` (`violations` integer NOT NULL CHECK (`violations` = 0));',
  'INSERT INTO `__fk_check` SELECT count(*) FROM pragma_foreign_key_check;',
  'DROP TABLE `__fk_check`;',
];

const incompatible = (statements) =>
  findIncompatibleStatements({
    sql: statements.join('\n--> statement-breakpoint\n'),
    migration: '0053_rebuild',
    migrationsDirectory: directory(),
  });

const kept = (tables) => [
  ...tables.map(take),
  ...rebuild,
  ...tables.map(restore),
  ...tables.map(discard),
  ...check,
];

describe('a rebuild of a table other tables cascade from', () => {
  it('follows ON DELETE actions transitively and ignores NO ACTION', () => {
    expect(
      cascadeClosure({ before: snapshot(true), table: 'events' }).sort(),
    ).toEqual(['reminders', 'rsvps']);
  });

  it('is cleared when every cascading table is copied aside and put back', () => {
    expect(incompatible(kept(['rsvps', 'reminders']))).toEqual([]);
  });

  it('flags the drop when a cascading table, however deep, is not kept', () => {
    expect(incompatible(rebuild)).toContain('DROP TABLE `events`;');
    expect(incompatible(kept(['rsvps']))).toContain('DROP TABLE `events`;');
  });

  it('flags a copy taken after the drop or put back before the rename', () => {
    const late = [
      ...rebuild.slice(0, 3),
      take('rsvps'),
      take('reminders'),
      rebuild[3],
      restore('rsvps'),
      restore('reminders'),
      discard('rsvps'),
      discard('reminders'),
    ];
    expect(incompatible(late)).toContain('DROP TABLE `events`;');
    const early = [
      take('rsvps'),
      take('reminders'),
      ...rebuild.slice(0, 3),
      restore('rsvps'),
      restore('reminders'),
      rebuild[3],
      discard('rsvps'),
      discard('reminders'),
    ];
    expect(incompatible(early)).toContain('DROP TABLE `events`;');
  });

  it('flags dropping a copy that was never put back', () => {
    const statements = kept(['rsvps', 'reminders']).filter(
      (statement) => statement !== restore('reminders'),
    );
    expect(incompatible(statements)).toEqual(
      expect.arrayContaining(['DROP TABLE `events`;', discard('reminders')]),
    );
  });

  it('still flags dropping a table this migration did not create', () => {
    expect(
      incompatible([...kept(['rsvps', 'reminders']), 'DROP TABLE `reports`;']),
    ).toEqual(['DROP TABLE `reports`;']);
  });

  it('clears the shipped online and hybrid events rebuild', () => {
    const migration = '0053_online_hybrid_events';
    expect(
      findIncompatibleStatements({
        sql: fs.readFileSync(
          path.join(shippedMigrations, `${migration}.sql`),
          'utf8',
        ),
        migration,
        migrationsDirectory: shippedMigrations,
      }),
    ).toEqual([]);
  });
});
