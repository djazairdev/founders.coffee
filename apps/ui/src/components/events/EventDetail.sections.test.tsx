import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventDetailItem } from '@founders-coffee/server-fns';

import type { HackathonPageDetails } from '../../features/hackathons/api';
import { event, market } from './EventDetail.fixtures';

vi.mock('../../features/hackathons/components/HackathonPageDetails', () => ({
  HackathonPageDetails: () => <section aria-label="Rules" />,
}));

const { EventDetail } = await import('./EventDetail');

afterEach(cleanup);

const show = (kind: EventDetailItem['kind'], details?: HackathonPageDetails) =>
  render(
    <EventDetail
      locale="en"
      market={market}
      event={{ ...event, kind }}
      host={null}
      isHost={false}
      live={null}
      isWindowOpen={false}
      phase="upcoming"
      mapboxToken={null}
      details={details}
    />,
  );

const hackathonDetails: HackathonPageDetails = {
  tracks: [],
  prizes: [],
  rules: {
    rules: null,
    minimumAge: null,
    attendanceModes: [],
    teamMin: 1,
    teamMax: 4,
    aiPolicy: 'disclosed',
    aiPolicyNote: null,
    licenceNote: null,
    applicationQuestions: [],
  },
  judges: [],
  mentors: [],
  workshops: [],
  results: null,
  registration: null,
};

describe('what the details of an event are called (#477)', () => {
  it('calls a meetup a meetup', () => {
    show('meetup');

    expect(
      screen.getByRole('heading', { name: 'Meetup details' }),
    ).toBeTruthy();
  });

  it('does not call a workshop a meetup', () => {
    show('workshop');

    expect(screen.getByRole('heading', { name: 'Details' })).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: 'Meetup details' }),
    ).toBeNull();
  });

  it('renders a hackathon description separately from its rules', () => {
    show('hackathon', hackathonDetails);

    const description = screen.getByRole('region', {
      name: 'Hackathon description',
    });
    const rules = screen.getByRole('region', { name: 'Rules' });

    expect(description.contains(rules)).toBe(false);
    expect(
      description.compareDocumentPosition(rules) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
