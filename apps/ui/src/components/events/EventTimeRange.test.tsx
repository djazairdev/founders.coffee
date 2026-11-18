import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EventTimeRange } from './EventTimeRange';

const TIME_ZONE = 'Africa/Algiers';
const START = new Date('2026-11-04T13:00:00Z');

const textOf = (locale: 'ar' | 'fr' | 'en', end: Date | null) =>
  render(
    <EventTimeRange
      locale={locale}
      timeZone={TIME_ZONE}
      start={START}
      end={end}
    />,
  ).container.textContent;

afterEach(cleanup);

describe('EventTimeRange', () => {
  it('gives only the hours when an event ends the day it starts', () => {
    const end = new Date('2026-11-04T15:00:00Z');

    expect(textOf('en', end)).toBe('14:00–16:00');
    cleanup();
    expect(textOf('ar', end)).toBe('من 14:00 إلى 16:00');
  });

  it('names the day an event ends on when that is a later day', () => {
    const end = new Date('2026-11-07T14:00:00Z');

    expect(textOf('en', end)).toBe('14:00 – Sat, Nov 7, 15:00');
    cleanup();
    expect(textOf('fr', end)).toBe('14:00 – sam. 7 nov., 15:00');
    cleanup();
    expect(textOf('ar', end)).toBe('من 14:00 إلى السبت، 7 نوفمبر 15:00');
  });

  it('counts the day where the event happens, not in UTC', () => {
    const start = new Date('2026-11-04T22:30:00Z');
    const { container } = render(
      <EventTimeRange
        locale="en"
        timeZone={TIME_ZONE}
        start={start}
        end={new Date('2026-11-04T23:30:00Z')}
      />,
    );

    expect(container.textContent).toBe('23:30 – Thu, Nov 5, 00:30');
  });
});
