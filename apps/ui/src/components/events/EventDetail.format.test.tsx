import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { type Locale } from '@founders-coffee/i18n';
import type { EventDetailItem } from '@founders-coffee/server-fns';

import { event, market } from './EventDetail.fixtures';

const { EventDetail } = await import('./EventDetail');

afterEach(() => cleanup());

const LINK = 'https://meet.example.com/founders';

const online = {
  ...event,
  format: 'online',
  venue: null,
  venueAddress: null,
  latitude: null,
  longitude: null,
} satisfies EventDetailItem;

const hybrid = { ...event, format: 'hybrid' } satisfies EventDetailItem;

const show = (item: EventDetailItem, locale: Locale = 'en') =>
  render(
    <EventDetail
      locale={locale}
      market={market}
      event={item}
      host={null}
      isHost={false}
      live={null}
      isWindowOpen={false}
      phase="upcoming"
      mapboxToken={null}
    />,
  );

const whereRows = (label = 'Where') => {
  const box = screen.getByText(label).parentElement;
  if (!box) throw new Error('nothing holds the Where label');
  return within(box)
    .getAllByRole('definition')
    .map((row) => row.textContent);
};

describe('an online or hybrid event on its page (B-EVT-12)', () => {
  it('says an online event is online, in its header and where a venue would be', () => {
    show(online);

    expect(screen.getByRole('banner').textContent).toContain('Online');
    expect(whereRows()).toEqual([
      'Online',
      event.cityName,
      'Members going see the meeting link here.',
    ]);
  });

  it('says a hybrid event is online and in person, and keeps its venue', () => {
    show(hybrid);

    expect(screen.getByRole('banner').textContent).toContain(
      'Online and in person',
    );
    expect(whereRows()[0]).toBe(event.venue);
  });

  it('gives the link to a reader it is for, opening apart from the page', () => {
    show({ ...online, meetingLink: LINK });
    const join = screen.getByRole('link', { name: 'Join the meeting' });

    expect(join.getAttribute('href')).toBe(LINK);
    expect(join.getAttribute('target')).toBe('_blank');
    expect(join.getAttribute('rel')).toBe('noopener noreferrer');
    expect(whereRows()).not.toContain(
      'Members going see the meeting link here.',
    );
  });

  it('promises the link to nobody once the event is cancelled', () => {
    show({ ...online, status: 'cancelled', cancelledAt: new Date() });

    expect(whereRows()).toEqual(['Online', event.cityName]);
  });

  it('labels nothing for an event held only in a room', () => {
    show(event);

    expect(screen.queryByText('Online')).toBeNull();
    expect(screen.queryByText(/meeting link/)).toBeNull();
  });

  it('labels it in Arabic on the Arabic page', () => {
    show(online, 'ar');

    expect(whereRows('أين')[0]).toBe('عبر الإنترنت');
  });
});
