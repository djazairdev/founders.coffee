import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EVENT_ID, mutation, teamView } from '../team-page.fixtures';
import { HackathonTeamMembers } from './HackathonTeamMembers';
import { HackathonTeamRequests } from './HackathonTeamRequests';

const mocks = vi.hoisted(() => ({
  changes: {} as Record<
    string,
    ReturnType<typeof import('../team-page.fixtures').mutation>
  >,
}));

const change = (name: string) => {
  mocks.changes[name] ??= mutation();
  return mocks.changes[name];
};

vi.mock('../team-hooks', () => ({
  useLeaveTeam: () => change('leave'),
  usePassCaptaincy: () => change('pass'),
  useRemoveTeamMember: () => change('remove'),
  useAnswerTeamRequest: () => change('answer'),
}));

const paragraph = (text: string) =>
  screen.getByText(
    (_, element) => element?.tagName === 'P' && element.textContent === text,
  );

afterEach(() => {
  cleanup();
  mocks.changes = {};
});

const teamOf = (changes: Parameters<typeof teamView>[1] = {}) => {
  const team = teamView({}, changes).team;
  if (!team) throw new Error('no team');
  return team;
};

const renderMembers = (
  team = teamOf(),
  viewerId = 'usr_captain',
  canChange = true,
) =>
  render(
    <HackathonTeamMembers
      eventId={EVENT_ID}
      team={team}
      viewerId={viewerId}
      canChange={canChange}
      locale="en"
    />,
  );

describe('HackathonTeamMembers (B-TEAM-07)', () => {
  it('lists the captain first, marked, and the viewer as you', () => {
    renderMembers();

    const items = screen.getAllByRole('listitem');
    expect(items[0]?.textContent).toContain('AminaCaptainYou');
    expect(items[1]?.textContent).toContain('Karim');
  });

  it('lets the captain pass the captaincy on, and remove a member once confirmed', () => {
    renderMembers();

    fireEvent.click(screen.getByRole('button', { name: 'Make captain' }));
    expect(change('pass').mutate).toHaveBeenCalledWith('usr_mate');

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(change('remove').mutate).not.toHaveBeenCalled();
    expect(paragraph('Remove Karim from the team?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(change('remove').mutate).toHaveBeenCalledWith(
      'usr_mate',
      expect.anything(),
    );
  });

  it('asks a captain with teammates to pass the captaincy before leaving', () => {
    renderMembers();

    expect(
      screen.getByText('To leave, make someone else captain first.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Leave the team' })).toBeNull();
  });

  it('lets a member leave once they confirm, with no captain actions', () => {
    renderMembers(teamOf({ isCaptain: false }), 'usr_mate');

    expect(screen.queryByRole('button', { name: 'Make captain' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Leave the team' }));
    expect(
      paragraph(
        'Leave Byte Club? You can join another team while teams can still change.',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(change('leave').mutate).toHaveBeenCalled();
  });

  it('lets a captain alone in the team leave it', () => {
    renderMembers(
      teamOf({
        members: [{ userId: 'usr_captain', name: 'Amina', isCaptain: true }],
      }),
    );

    expect(screen.getByRole('button', { name: 'Leave the team' })).toBeTruthy();
  });

  it('offers nothing to change once teams are locked', () => {
    renderMembers(teamOf(), 'usr_captain', false);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('says why a change was refused', () => {
    change('pass').isError = true;
    change('pass').error = Object.assign(new Error('locked'), {
      code: 'teams_locked',
    });
    renderMembers();

    expect(
      screen.getByText('Teams can no longer change: submissions have closed.'),
    ).toBeTruthy();
  });
});

describe('HackathonTeamRequests (B-TEAM-07)', () => {
  it('lets the captain accept or decline each request', () => {
    render(
      <HackathonTeamRequests
        eventId={EVENT_ID}
        requests={teamOf().requests}
        locale="en"
      />,
    );

    expect(screen.getByText('Sofiane')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(change('answer').mutate).toHaveBeenCalledWith({
      requestId: 'treq_1',
      decision: 'accept',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(change('answer').mutate).toHaveBeenLastCalledWith({
      requestId: 'treq_1',
      decision: 'decline',
    });
  });

  it('says when nobody is asking', () => {
    render(
      <HackathonTeamRequests eventId={EVENT_ID} requests={[]} locale="ar" />,
    );

    expect(screen.getByText('لا أحد يطلب الانضمام الآن.')).toBeTruthy();
  });
});
