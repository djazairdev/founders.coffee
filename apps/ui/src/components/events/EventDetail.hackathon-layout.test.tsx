import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  HackathonPageDetails,
  HackathonSchedule,
} from '../../features/hackathons/api';
import { event, market } from './EventDetail.fixtures';

vi.mock('../markdown/useMarkdownRuntime', () => ({
  useMarkdownRuntime: () => ({ status: 'loading' }),
}));

const { EventDetail } = await import('./EventDetail');

afterEach(() => cleanup());

const details: HackathonPageDetails = {
  tracks: [],
  prizes: [],
  rules: {
    rules: null,
    minimumAge: null,
    attendanceModes: ['online'],
    teamMin: 1,
    teamMax: 4,
    aiPolicy: 'disclosed',
    aiPolicyNote: null,
    licenceNote: null,
  },
  judges: [],
  mentors: [],
  workshops: [],
  results: null,
  registration: {
    isFull: false,
    viewer: null,
    isJudge: false,
    isOrganiser: false,
  },
};

const schedule: HackathonSchedule = {
  registrationOpensAt: Date.parse('2099-01-01T08:00:00Z'),
  registrationClosesAt: Date.parse('2099-01-10T17:00:00Z'),
  kickoffAt: Date.parse('2099-01-15T09:00:00Z'),
  submissionDeadlineAt: Date.parse('2099-01-16T11:00:00Z'),
  endsAt: Date.parse('2099-01-16T17:00:00Z'),
  judgingEndsAt: Date.parse('2099-01-20T17:00:00Z'),
  phase: 'registration_open',
};

describe('the public hackathon layout', () => {
  it('keeps the hero compact and puts registration before the full description', () => {
    const description =
      '# Challenge\n\nBuild a useful tool that helps teams plan a hackathon project. This event brings local builders together to share working ideas.';
    const { container } = render(
      <EventDetail
        locale="en"
        market={market}
        event={{ ...event, kind: 'hackathon', description }}
        host={null}
        isHost={false}
        live={null}
        isWindowOpen={false}
        phase="upcoming"
        mapboxToken={null}
        hackathon={schedule}
        details={details}
      />,
    );
    const registration = screen.getByRole('region', {
      name: 'Registration action',
    });
    const fullDescription = screen.getByRole('region', {
      name: 'Hackathon description',
    });
    const header = container.querySelector('header');

    expect(header?.textContent).toContain(
      'Build a useful tool that helps teams plan a hackathon project.',
    );
    expect(header?.textContent).not.toContain('Challenge');
    expect(
      registration.compareDocumentPosition(fullDescription) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Challenge', level: 2 }),
    ).toBeTruthy();
  });

  it('shows and links the hackathon organising organisations in the hero', () => {
    render(
      <EventDetail
        locale="en"
        market={market}
        event={{ ...event, kind: 'hackathon' }}
        host={
          { userId: 'usr_1', displayName: 'Yacine' } as NonNullable<
            Parameters<typeof EventDetail>[0]['host']
          >
        }
        isHost={false}
        live={null}
        isWindowOpen={false}
        phase="upcoming"
        mapboxToken={null}
        organisations={[{ name: 'Code Club Alger', slug: 'code-club-alger' }]}
      />,
    );

    expect(
      screen
        .getByRole('link', { name: 'Code Club Alger' })
        .getAttribute('href'),
    ).toBe('/en/o/code-club-alger');
    expect(screen.queryByRole('link', { name: 'Yacine' })).toBeNull();
  });
});
