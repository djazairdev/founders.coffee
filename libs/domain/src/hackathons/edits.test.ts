import { describe, expect, it } from 'vitest';

import type { HackathonDetailsInput } from './draft.js';
import {
  areTracksEditable,
  editStageAt,
  isPrizeAddable,
  isPrizeChangeable,
  isPrizeConfirmable,
  isPrizeRemovable,
  isRubricEditable,
  isTrackRemovable,
  lockedDetailChanges,
} from './edits.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const OPENS = Date.UTC(2099, 1, 1, 8);

const saved: HackathonDetailsInput = {
  registrationOpensAt: OPENS,
  registrationClosesAt: OPENS + 30 * DAY,
  submissionDeadlineAt: OPENS + 33 * DAY,
  judgingEndsAt: OPENS + 40 * DAY,
  attendanceModes: ['in_person', 'online'],
  teamMin: 1,
  teamMax: 4,
  capacity: 100,
  minimumAge: 18,
  rules: 'Build something new.',
  aiPolicy: 'disclosed',
  licenceNote: 'Teams keep what they build.',
};

const BEFORE_OPENING = OPENS - DAY;
const DURING_REGISTRATION = OPENS + DAY;
const AFTER_JUDGING = OPENS + 41 * DAY;

describe('editStageAt (B-HKN-07)', () => {
  it('is open until registration opens, locked until judging ends, then closed', () => {
    expect(editStageAt(null, true, AFTER_JUDGING)).toBe('open');
    expect(editStageAt(saved, true, BEFORE_OPENING)).toBe('open');
    expect(editStageAt(saved, true, OPENS)).toBe('locked');
    expect(editStageAt(saved, true, saved.judgingEndsAt - 1)).toBe('locked');
    expect(editStageAt(saved, true, saved.judgingEndsAt)).toBe('closed');
  });

  it('stays open while the hackathon is unpublished, since nobody could register', () => {
    expect(editStageAt(saved, false, DURING_REGISTRATION)).toBe('open');
    expect(editStageAt(saved, false, AFTER_JUDGING)).toBe('open');
  });
});

const changesAt = (
  before: HackathonDetailsInput,
  after: HackathonDetailsInput,
  now: number,
) => lockedDetailChanges(before, after, editStageAt(before, true, now), now);

describe('lockedDetailChanges (B-HKN-07)', () => {
  it('allows any change before registration opens', () => {
    expect(
      changesAt(
        saved,
        { ...saved, teamMax: 2, rules: undefined, capacity: 10 },
        BEFORE_OPENING,
      ),
    ).toEqual([]);
  });

  it('keeps the rules people registered under once registration opens', () => {
    const edit = {
      ...saved,
      rules: 'New rules.',
      teamMin: 2,
      teamMax: 5,
      minimumAge: undefined,
      aiPolicy: 'restricted',
      aiPolicyNote: 'No AI.',
      licenceNote: undefined,
      attendanceModes: ['online'],
    } satisfies HackathonDetailsInput;

    expect(changesAt(saved, edit, DURING_REGISTRATION).sort()).toEqual(
      [
        'aiPolicy',
        'aiPolicyNote',
        'attendanceModes',
        'licenceNote',
        'minimumAge',
        'rules',
        'teamMax',
        'teamMin',
      ].sort(),
    );
  });

  it('reads the ways to take part as a set', () => {
    expect(
      changesAt(
        saved,
        { ...saved, attendanceModes: ['online', 'in_person'] },
        DURING_REGISTRATION,
      ),
    ).toEqual([]);
  });

  it('moves dates only later once locked, and never one that has passed', () => {
    expect(
      changesAt(
        saved,
        {
          ...saved,
          registrationClosesAt: saved.registrationClosesAt + DAY,
          judgingEndsAt: saved.judgingEndsAt + DAY,
        },
        DURING_REGISTRATION,
      ),
    ).toEqual([]);
    expect(
      changesAt(
        saved,
        {
          ...saved,
          registrationOpensAt: OPENS + 2 * DAY,
          submissionDeadlineAt: saved.submissionDeadlineAt - HOUR,
        },
        DURING_REGISTRATION,
      ),
    ).toEqual(['registrationOpensAt', 'submissionDeadlineAt']);
  });

  it('lets places only grow once locked, or open up with no limit', () => {
    const at = DURING_REGISTRATION;
    expect(changesAt(saved, { ...saved, capacity: 150 }, at)).toEqual([]);
    expect(changesAt(saved, { ...saved, capacity: undefined }, at)).toEqual([]);
    expect(changesAt(saved, { ...saved, capacity: 99 }, at)).toEqual([
      'capacity',
    ]);
    expect(
      changesAt(
        { ...saved, capacity: undefined },
        { ...saved, capacity: 500 },
        at,
      ),
    ).toEqual(['capacity']);
  });

  it('refuses every change once judging has ended, and none that changes nothing', () => {
    expect(
      changesAt(
        saved,
        { ...saved, judgingEndsAt: saved.judgingEndsAt + DAY },
        AFTER_JUDGING,
      ),
    ).toEqual(['judgingEndsAt']);
    expect(changesAt(saved, { ...saved }, AFTER_JUDGING)).toEqual([]);
  });
});

describe('what each stage allows beyond the details (B-HKN-07)', () => {
  it('keeps the rubric and track removals to before registration opens', () => {
    expect([isRubricEditable('open'), isRubricEditable('locked')]).toEqual([
      true,
      false,
    ]);
    expect([isTrackRemovable('open'), isTrackRemovable('locked')]).toEqual([
      true,
      false,
    ]);
    expect([areTracksEditable('locked'), areTracksEditable('closed')]).toEqual([
      true,
      false,
    ]);
  });

  it('lets prizes be added and confirmed until the end, changed before opening, and withdrawn unconfirmed', () => {
    expect([isPrizeAddable('locked'), isPrizeAddable('closed')]).toEqual([
      true,
      false,
    ]);
    expect([isPrizeChangeable('open'), isPrizeChangeable('locked')]).toEqual([
      true,
      false,
    ]);
    expect([
      isPrizeRemovable('open', false),
      isPrizeRemovable('open', true),
      isPrizeRemovable('locked', false),
    ]).toEqual([true, false, false]);
    expect([
      isPrizeConfirmable('locked', false),
      isPrizeConfirmable('open', true),
      isPrizeConfirmable('closed', false),
    ]).toEqual([true, false, false]);
  });
});
