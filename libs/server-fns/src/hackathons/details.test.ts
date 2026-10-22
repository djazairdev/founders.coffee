import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  events,
  hackathons as hackathonDetails,
  readHackathonLeadOrganisation,
  type Db,
} from '@founders-coffee/db';

import { hostAnEvent } from '../events/update.fixtures.js';
import { saveHackathonDetailsResolver } from './details.js';
import { hackathonDraftResolver } from './draft-view.js';
import {
  codeOf,
  DAY,
  detailsFor,
  draftHackathon,
  hackathonWithDetails,
  HOUR,
  ORGANISATION,
  setHackathons,
  setupHackathonDb,
} from './edit.fixtures.js';

describe("a hackathon's details (B-HKN-12, B-HKN-07, real D1)", () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupHackathonDb();
  });

  it('reads a draft without details, and names its lead', async () => {
    const { eventId, kickoff } = await draftHackathon(db);

    const read = await hackathonDraftResolver(db, eventId);
    if (!read.ok) throw read.error;
    expect(read.data).toMatchObject({
      event: {
        id: eventId,
        title: 'Algiers Builders Hackathon',
        format: 'online',
        status: 'draft',
        currency: 'DZD',
        startsAt: kickoff,
        endsAt: kickoff + 2 * DAY,
      },
      organisation: {
        id: ORGANISATION,
        name: 'Algiers Builders',
        slug: 'algiers-builders',
      },
      version: 1,
      stage: 'open',
      isEditable: true,
      details: null,
      tracks: [],
      prizes: [],
      criteria: [],
    });
    expect(await readHackathonLeadOrganisation(db, eventId)).toBe(ORGANISATION);
  });

  it('writes the details the first time and replaces them after', async () => {
    const { eventId, kickoff } = await draftHackathon(db);

    const first = await saveHackathonDetailsResolver(db, {
      eventId,
      version: 1,
      organisationId: ORGANISATION,
      details: detailsFor(kickoff),
    });
    expect(first.ok && first.data.version).toBe(2);
    const second = await saveHackathonDetailsResolver(db, {
      eventId,
      version: 2,
      organisationId: ORGANISATION,
      details: detailsFor(kickoff, {
        teamMax: 5,
        capacity: 80,
        minimumAge: 18,
        aiPolicyNote: undefined,
      }),
    });
    expect(second.ok && second.data.version).toBe(3);

    const read = await hackathonDraftResolver(db, eventId);
    if (!read.ok) throw read.error;
    expect(read.data.details).toMatchObject({
      attendanceModes: ['online'],
      teamMin: 2,
      teamMax: 5,
      capacity: 80,
      minimumAge: 18,
      aiPolicy: 'ai_native',
      aiPolicyNote: null,
      licenceNote: 'Teams keep what they build.',
      registrationClosesAt: kickoff - DAY,
    });
    expect(
      await db
        .select({ status: hackathonDetails.reviewStatus })
        .from(hackathonDetails)
        .where(eq(hackathonDetails.eventId, eventId)),
    ).toEqual([{ status: 'draft' }]);
  });

  it('holds the details to the saved event, and writes nothing that does not fit', async () => {
    const { eventId, kickoff } = await draftHackathon(db);

    const late = await saveHackathonDetailsResolver(db, {
      eventId,
      version: 1,
      organisationId: ORGANISATION,
      details: detailsFor(kickoff, { registrationClosesAt: kickoff + HOUR }),
    });
    const inPerson = await saveHackathonDetailsResolver(db, {
      eventId,
      version: 1,
      organisationId: ORGANISATION,
      details: detailsFor(kickoff, { attendanceModes: ['in_person'] }),
    });

    expect(codeOf(late)).toBe('validation_failed');
    expect(codeOf(inPerson)).toBe('validation_failed');
    expect(
      await db
        .select({ id: hackathonDetails.eventId })
        .from(hackathonDetails)
        .where(eq(hackathonDetails.eventId, eventId)),
    ).toEqual([]);
  });

  it('refuses a save built from a stale page, and writes nothing', async () => {
    const { eventId, kickoff, version } = await hackathonWithDetails(db);

    const stale = await saveHackathonDetailsResolver(db, {
      eventId,
      version: version - 1,
      organisationId: ORGANISATION,
      details: detailsFor(kickoff, { teamMax: 6 }),
    });
    const read = await hackathonDraftResolver(db, eventId);

    expect(codeOf(stale)).toBe('hackathon_conflict');
    expect(read.ok && [read.data.version, read.data.details?.teamMax]).toEqual([
      version,
      4,
    ]);
  });

  it('leaves a cancelled hackathon, or one with the reviewers, alone', async () => {
    const cancelled = await hackathonWithDetails(db);
    const submitted = await hackathonWithDetails(db);
    await db
      .update(events)
      .set({ status: 'cancelled' })
      .where(eq(events.id, cancelled.eventId));
    await db
      .update(hackathonDetails)
      .set({ reviewStatus: 'submitted' })
      .where(eq(hackathonDetails.eventId, submitted.eventId));

    for (const { eventId, kickoff, version } of [cancelled, submitted]) {
      const saved = await saveHackathonDetailsResolver(db, {
        eventId,
        version,
        organisationId: ORGANISATION,
        details: detailsFor(kickoff),
      });
      const read = await hackathonDraftResolver(db, eventId);
      expect(codeOf(saved)).toBe('hackathon_not_editable');
      expect(read.ok && read.data.isEditable).toBe(false);
    }
  });

  it('keeps the rules people registered under once registration opens', async () => {
    const opened = Math.floor((Date.now() - DAY) / 1000) * 1000;
    const { eventId, kickoff, version } = await hackathonWithDetails(
      db,
      { registrationOpensAt: opened, capacity: 50 },
      true,
    );
    const edit = (overrides: Record<string, unknown>, at: number) =>
      saveHackathonDetailsResolver(db, {
        eventId,
        version: at,
        organisationId: ORGANISATION,
        details: detailsFor(kickoff, {
          registrationOpensAt: opened,
          capacity: 50,
          ...overrides,
        }),
      });

    const locked = await edit({ teamMax: 5, capacity: 40 }, version);
    expect(locked.ok ? null : locked.error).toMatchObject({
      code: 'hackathon_field_locked',
      details: { fields: expect.arrayContaining(['teamMax', 'capacity']) },
    });
    const later = await edit(
      { capacity: 80, judgingEndsAt: kickoff + 10 * DAY },
      version,
    );
    expect(later.ok && later.data.version).toBe(version + 1);
    const read = await hackathonDraftResolver(db, eventId);
    expect(read.ok && read.data.stage).toBe('locked');
    expect(read.ok && read.data.details?.capacity).toBe(80);
  });

  it('answers not found for a meetup, and closes with the market', async () => {
    const meetup = await hostAnEvent(db, { title: 'A plain meetup' });
    const { eventId, kickoff } = await draftHackathon(db);

    expect(codeOf(await hackathonDraftResolver(db, meetup.id))).toBe(
      'event_not_found',
    );
    expect(await readHackathonLeadOrganisation(db, meetup.id)).toBeNull();

    await setHackathons(db, false);
    expect(codeOf(await hackathonDraftResolver(db, eventId))).toBe(
      'hackathons_disabled',
    );
    expect(
      codeOf(
        await saveHackathonDetailsResolver(db, {
          eventId,
          version: 1,
          organisationId: ORGANISATION,
          details: detailsFor(kickoff),
        }),
      ),
    ).toBe('hackathons_disabled');
  });
});
