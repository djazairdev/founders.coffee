import { beforeEach, describe, expect, it } from 'vitest';

import { type Db } from '@founders-coffee/db';
import type { hackathons } from '@founders-coffee/domain';

import { saveHackathonRubricResolver } from './rubric.js';
import {
  codeOf,
  criterion,
  hackathonWithDetails,
  idOf,
  OPENED,
  ORGANISATION,
  readDraft,
  setupHackathonDb,
  versionOf,
} from './edit.fixtures.js';

describe("a hackathon's rubric (B-HKN-07, real D1)", () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupHackathonDb();
  });

  const saveRubric = (
    eventId: string,
    version: number,
    criteria: {
      id: string | null;
      criterion: hackathons.HackathonCriterionInput;
    }[],
  ) =>
    saveHackathonRubricResolver(db, {
      eventId,
      version,
      organisationId: ORGANISATION,
      criteria,
    });

  it('replaces the rubric, keeping the ids it is given', async () => {
    const { eventId, version } = await hackathonWithDetails(db);
    const first = versionOf(
      await saveRubric(eventId, version, [
        { id: null, criterion: criterion('Impact', 40) },
        { id: null, criterion: criterion('Craft', 30) },
        { id: null, criterion: criterion('Demo', 30) },
      ]),
    );
    const [impact, craft] = (await readDraft(db, eventId)).criteria;

    versionOf(
      await saveRubric(eventId, first, [
        { id: idOf(craft), criterion: criterion('Craft', 25) },
        { id: idOf(impact), criterion: criterion('Impact', 25) },
        { id: null, criterion: criterion('Originality', 25) },
        { id: null, criterion: criterion('Demo', 25) },
      ]),
    );

    const read = await readDraft(db, eventId);
    expect(
      read.criteria.map(({ id, name, weight }) => [id, name, weight]),
    ).toEqual([
      [idOf(craft), 'Craft', 25],
      [idOf(impact), 'Impact', 25],
      [expect.stringMatching(/^crt_/), 'Originality', 25],
      [expect.stringMatching(/^crt_/), 'Demo', 25],
    ]);
  });

  it('refuses weights that do not add up to 100, and any change once registration opens', async () => {
    const open = await hackathonWithDetails(db);
    const opened = await hackathonWithDetails(db, OPENED, true);
    const rubric = [
      { id: null, criterion: criterion('Impact', 40) },
      { id: null, criterion: criterion('Craft', 30) },
      { id: null, criterion: criterion('Demo', 20) },
    ];

    expect(codeOf(await saveRubric(open.eventId, open.version, rubric))).toBe(
      'validation_failed',
    );
    expect(
      codeOf(await saveRubric(opened.eventId, opened.version, rubric)),
    ).toBe('hackathon_field_locked');
  });
});
