import { describe, expect, it } from 'vitest';

import { count, rows, seeded } from './dev-seed.fixtures.mjs';
import { accountId } from './rows.mjs';
import { seedStatements } from './statements.mjs';

const NOW = 1_800_000_000;
const seededHackathon = (db, slug) =>
  db
    .prepare(
      `select h.* , e.id as id, e.starts_at as startsAt from hackathons h join events e on e.id = h.event_id where e.slug = ?`,
    )
    .get(slug);
const inEvent = (db, table, eventId) =>
  db
    .prepare(`select count(*) as n from "${table}" where event_id = ?`)
    .get(eventId).n;

describe('a hackathon in every phase (B-LCH-01)', () => {
  it('opens registration in one, with the captain still free to register', () => {
    const db = seeded(NOW);
    const hackathon = seededHackathon(db, 'dev-hackathon-registration');

    expect(hackathon.registration_opens_at).toBeLessThan(NOW);
    expect(hackathon.registration_closes_at).toBeGreaterThan(NOW);
    expect(inEvent(db, 'hackathon_teams', hackathon.id)).toBe(0);
    expect(inEvent(db, 'hackathon_registrations', hackathon.id)).toBe(1);
    expect(hackathon.registered_count).toBe(1);
    expect(
      db
        .prepare(
          'select count(*) as n from hackathon_registrations where event_id = ? and user_id = ?',
        )
        .get(hackathon.id, accountId('dev-member@dev.invalid')).n,
    ).toBe(0);
  });

  it('has teams building in another, one entry in before its deadline', () => {
    const db = seeded(NOW);
    const hackathon = seededHackathon(db, 'dev-hackathon-building');

    expect(hackathon.startsAt).toBeLessThan(NOW);
    expect(hackathon.submission_deadline_at).toBeGreaterThan(NOW);
    expect(inEvent(db, 'hackathon_teams', hackathon.id)).toBe(1);
    expect(inEvent(db, 'hackathon_submissions', hackathon.id)).toBe(1);
    expect(inEvent(db, 'hackathon_scores', hackathon.id)).toBe(0);
  });

  it('leaves the judge one entry of two to score in another', () => {
    const db = seeded(NOW);
    const hackathon = seededHackathon(db, 'dev-hackathon-judging');

    expect(hackathon.submission_deadline_at).toBeLessThan(NOW);
    expect(hackathon.judging_ends_at).toBeGreaterThan(NOW);
    expect(hackathon.results_published_at).toBeNull();
    expect(inEvent(db, 'hackathon_submissions', hackathon.id)).toBe(2);
    expect(
      db
        .prepare(
          'select count(distinct submission_id) as n from hackathon_scores where event_id = ?',
        )
        .get(hackathon.id).n,
    ).toBe(1);
  });

  it('publishes ranks, a prize and certificates in the last', () => {
    const db = seeded(NOW);
    const hackathon = seededHackathon(db, 'dev-hackathon-results');

    expect(hackathon.judging_ends_at).toBeLessThan(NOW);
    expect(hackathon.results_published_at).toBeLessThan(NOW);
    expect(
      rows(
        db,
        `select title, rank, total from hackathon_results where event_id = '${hackathon.id}' order by rank`,
      ),
    ).toEqual([
      { title: 'Ledger', rank: 1, total: 92 },
      { title: 'Souk', rank: 2, total: 60 },
    ]);
    expect(count(db, 'hackathon_prize_awards')).toBe(1);
    expect(inEvent(db, 'hackathon_certificates', hackathon.id)).toBe(6);
  });

  it('gives every one a judge and the club as its organiser, in a market with hackathons on', () => {
    const db = seeded(NOW);

    expect(count(db, 'hackathon_judges')).toBe(4);
    expect(count(db, 'event_organisers')).toBe(4);
    expect(
      rows(
        db,
        `select code, json_extract(feature_flags, '$.hackathons') as isOn from markets order by code`,
      ),
    ).toEqual([
      { code: 'DZ', isOn: 1 },
      { code: 'EG', isOn: 0 },
      { code: 'SA', isOn: 0 },
    ]);
  });

  it('writes nothing new when it runs again', () => {
    const db = seeded(NOW);
    const before = count(db, 'hackathon_scores');
    for (const statement of seedStatements(NOW)) db.exec(statement);
    expect(count(db, 'hackathon_scores')).toBe(before);
    expect(count(db, 'events')).toBe(7);
  });
});
