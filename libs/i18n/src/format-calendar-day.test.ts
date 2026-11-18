import { describe, expect, it } from 'vitest';

import { calendarDayParts } from './format.js';

describe('a calendar day as a market names it', () => {
  it('names the Algerian month in Arabic, which bare Arabic does not', () => {
    expect(calendarDayParts('2027-01-22', 'ar', 'DZ')).toEqual({
      weekday: 'الجمعة',
      day: '22',
      month: 'جانفي',
      year: '2027',
    });
  });

  it('keeps the month the market uses where it is the bare one', () => {
    expect(calendarDayParts('2027-01-22', 'ar', 'EG').month).toBe('يناير');
  });

  it.each([
    ['fr', { weekday: 'vendredi', day: '22', month: 'janvier', year: '2027' }],
    ['en', { weekday: 'Friday', day: '22', month: 'January', year: '2027' }],
  ] as const)('names the parts in %s', (locale, parts) => {
    expect(calendarDayParts('2027-01-22', locale, 'DZ')).toEqual(parts);
  });

  it('reads the day as a date, which no time zone moves', () => {
    expect(calendarDayParts('2027-01-30', 'en', 'DZ')).toEqual({
      weekday: 'Saturday',
      day: '30',
      month: 'January',
      year: '2027',
    });
    expect(calendarDayParts('2027-01-04', 'fr', 'SA').weekday).toBe('lundi');
  });
});
