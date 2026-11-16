import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { EventDetailItem } from '@founders-coffee/server-fns';

import { event, market } from './EventDetail.fixtures';

const { EventDetail } = await import('./EventDetail');

afterEach(cleanup);

const show = (item: EventDetailItem) =>
  render(
    <EventDetail
      locale="en"
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

describe('the language of what a host wrote (#476)', () => {
  it('marks the title and description with the language they are written in', () => {
    show({
      ...event,
      title: 'Rencontre des fondateurs',
      description: 'Un café entre fondateurs.',
      languages: ['ar', 'fr'],
    });

    expect(
      screen.getByRole('heading', { level: 1 }).querySelector('bdi')?.lang,
    ).toBe('fr');
    expect(
      screen
        .getByText('Un café entre fondateurs.')
        .closest('[role="region"]')
        ?.getAttribute('lang'),
    ).toBe('fr');
  });

  it('leaves them unmarked when the language cannot be told', () => {
    show({
      ...event,
      title: 'Founders meetup',
      description: 'Coffee with founders.',
      languages: ['fr', 'en'],
    });

    expect(
      screen.getByRole('heading', { level: 1 }).querySelector('bdi')?.lang,
    ).toBe('');
    expect(
      screen
        .getByText('Coffee with founders.')
        .closest('[role="region"]')
        ?.getAttribute('lang'),
    ).toBeNull();
  });
});
