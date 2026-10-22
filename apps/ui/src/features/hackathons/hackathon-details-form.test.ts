import { describe, expect, it } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import {
  checkDetails,
  initialDetailsValues,
  instantOf,
  localInput,
  offeredModes,
  type DetailsFormValues,
} from './hackathon-details-form';
import {
  DEMO_DAY,
  draftView,
  KICKOFF,
  savedDetails,
} from './hackathon-details-form.fixtures';

const ALGIERS = 'Africa/Algiers';

const filled = (
  changes: Partial<DetailsFormValues> = {},
): DetailsFormValues => ({
  ...initialDetailsValues(draftView(), ALGIERS),
  registrationOpensAt: '2099-02-01T09:00',
  registrationClosesAt: '2099-03-10T22:00',
  submissionDeadlineAt: '2099-03-14T13:00',
  judgingEndsAt: '2099-03-21T18:00',
  aiPolicy: 'ai_native',
  ...changes,
});

const check = (values: DetailsFormValues, locale: Locale = 'en') =>
  checkDetails(values, draftView().event, ALGIERS, locale);

describe('the market’s wall clock in a datetime field', () => {
  it('reads and writes an instant in the market’s time zone', () => {
    expect(localInput(KICKOFF, ALGIERS)).toBe('2099-03-12T09:00');
    expect(instantOf('2099-03-12T09:00', ALGIERS)).toBe(KICKOFF);
  });

  it('names no instant for an empty or unreadable value', () => {
    expect(instantOf('', ALGIERS)).toBeUndefined();
    expect(instantOf('2099-03-12', ALGIERS)).toBeUndefined();
    expect(instantOf('2099-03-12T09:00', 'Nowhere/Atlantis')).toBeUndefined();
  });
});

describe('initialDetailsValues', () => {
  it('starts a new hackathon with no date or AI policy, and the format’s attendance', () => {
    const values = initialDetailsValues(draftView(), ALGIERS);

    expect(values).toMatchObject({
      registrationOpensAt: '',
      judgingEndsAt: '',
      attendanceModes: ['online'],
      teamMin: '1',
      teamMax: '4',
      capacity: '',
      aiPolicy: null,
    });
    expect(offeredModes('hybrid')).toEqual(['in_person', 'online']);
    expect(offeredModes('in_person')).toEqual(['in_person']);
  });

  it('fills the form from saved details', () => {
    const values = initialDetailsValues(
      draftView({ details: savedDetails }),
      ALGIERS,
    );

    expect(values).toMatchObject({
      registrationClosesAt: '2099-03-10T22:00',
      teamMin: '2',
      teamMax: '5',
      capacity: '',
      minimumAge: '18',
      aiPolicy: 'disclosed',
      aiPolicyNote: '',
      licenceNote: 'Teams keep what they build.',
    });
  });
});

describe('checkDetails', () => {
  it('turns a complete form into the details the server takes', () => {
    const checked = check(filled({ capacity: ' ', rules: '' }));

    expect(checked).toEqual({
      ok: true,
      details: {
        registrationOpensAt: Date.UTC(2099, 1, 1, 8, 0),
        registrationClosesAt: Date.UTC(2099, 2, 10, 21, 0),
        submissionDeadlineAt: Date.UTC(2099, 2, 14, 12, 0),
        judgingEndsAt: Date.UTC(2099, 2, 21, 17, 0),
        attendanceModes: ['online'],
        teamMin: 1,
        teamMax: 4,
        aiPolicy: 'ai_native',
      },
    });
  });

  it('files a timeline issue under the date the organiser can move', () => {
    const late = check(filled({ registrationClosesAt: '2099-03-12T10:00' }));
    const after = check(filled({ submissionDeadlineAt: '2099-03-14T19:00' }));

    expect(late.ok ? null : Object.keys(late.errors)).toEqual([
      'registrationClosesAt',
    ]);
    expect(after.ok ? null : after.errors).toEqual({
      submissionDeadlineAt:
        'Submissions close after kickoff, and no later than the end of demo day.',
    });
    expect(DEMO_DAY).toBeGreaterThan(KICKOFF);
  });

  it('keeps the largest team no smaller than the smallest, once the rest fits', () => {
    const checked = check(filled({ teamMin: '4', teamMax: '2' }));

    expect(checked.ok ? null : checked.errors).toEqual({
      teamMax:
        'Enter a whole number no smaller than the smallest team, up to 10.',
    });
  });

  it('names every field still to fill, in the reader’s language', () => {
    const checked = check(
      filled({
        registrationOpensAt: '',
        attendanceModes: [],
        aiPolicy: null,
        capacity: '1.5',
      }),
      'fr',
    );

    expect(checked.ok ? null : checked.errors).toEqual({
      registrationOpensAt: 'Choisissez quand les inscriptions ouvrent.',
      attendanceModes: 'Choisissez comment participer.',
      aiPolicy: 'Choisissez une politique sur l’IA.',
      capacity: 'Saisissez un nombre entier jusqu’à 100000, ou laissez vide.',
    });
  });

  it('asks for an empty date rather than for its order', () => {
    const checked = check(
      filled({
        registrationClosesAt: '',
        submissionDeadlineAt: '',
        judgingEndsAt: '',
      }),
      'ar',
    );

    expect(checked.ok ? null : checked.errors).toEqual({
      registrationClosesAt: 'اختر موعد انتهاء التسجيل.',
      submissionDeadlineAt: 'اختر آخر موعد للتسليم.',
      judgingEndsAt: 'اختر موعد انتهاء التحكيم.',
    });
  });
});
