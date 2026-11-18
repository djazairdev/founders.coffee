import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TeamPageView } from '../api';
import { HackathonTeamProject } from './HackathonTeamProject';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  confirm: vi.fn(),
  publish: vi.fn(),
}));

const change = (mutate: () => void) => ({
  mutate,
  isPending: false,
  isError: false,
  error: null,
});

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    params,
    children,
  }: {
    params: { slug: string };
    children: ReactNode;
  }) => <a href={`/p/${params.slug}`}>{children}</a>,
}));

vi.mock('../team-hooks', () => ({
  useCreateProject: () => change(mocks.create),
  useConfirmProject: () => change(mocks.confirm),
  usePublishProject: () => change(mocks.publish),
}));

const MADE: NonNullable<TeamPageView['project']> = {
  stage: 'made',
  id: 'prj_1',
  slug: 'ledger-ab12cd34',
  title: 'Ledger',
  status: 'draft',
  isOwner: false,
  isOnProject: true,
  isListed: false,
  teammates: 2,
  confirmedTeammates: 0,
  canPublish: false,
};

const show = (project: NonNullable<TeamPageView['project']>) =>
  render(
    <HackathonTeamProject eventId="evt_1" project={project} locale="en" />,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('HackathonTeamProject', () => {
  it('lets a captain make the project', () => {
    show({ stage: 'can_create' });

    fireEvent.click(screen.getByRole('button', { name: 'Create the page' }));

    expect(mocks.create).toHaveBeenCalledOnce();
  });

  it('asks a teammate to confirm, and passes the project to the change', () => {
    show(MADE);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(mocks.confirm).toHaveBeenCalledWith('prj_1');
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
  });

  it('holds publishing back until a teammate confirmed', () => {
    show({ ...MADE, isOwner: true, isListed: true });

    expect(
      (screen.getByRole('button', { name: 'Publish' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText(/at least one teammate/u)).toBeTruthy();
  });

  it('publishes for an owner with a confirmed teammate', () => {
    show({
      ...MADE,
      isOwner: true,
      isListed: true,
      confirmedTeammates: 1,
      canPublish: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(mocks.publish).toHaveBeenCalledWith('prj_1');
    expect(screen.getByText('Teammates who confirmed: 1 of 2')).toBeTruthy();
  });

  it('says a published page is published and offers nothing else', () => {
    show({ ...MADE, status: 'published', isOwner: true, isListed: true });

    expect(screen.getByText('Published.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('links someone on the project to its edit screen, and nobody else', () => {
    render(<HackathonTeamProject eventId="evt_1" project={MADE} locale="en" />);
    expect(screen.getByRole('link', { name: 'Manage the page' })).toBeTruthy();
    cleanup();

    render(
      <HackathonTeamProject
        eventId="evt_1"
        project={{ ...MADE, isOnProject: false }}
        locale="en"
      />,
    );
    expect(screen.queryByRole('link', { name: 'Manage the page' })).toBeNull();
  });
});
