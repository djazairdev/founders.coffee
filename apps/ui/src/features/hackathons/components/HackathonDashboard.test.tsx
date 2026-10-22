import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type {
  HackathonDashboard as Dashboard,
  HackathonDraftView,
} from '../api';
import { draftView, savedDetails } from '../hackathon-details-form.fixtures';
import { HackathonDashboard } from './HackathonDashboard';

const mocks = vi.hoisted(() => ({
  dashboard: {
    data: undefined as unknown,
    isError: false,
    refetch: vi.fn(),
  },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
    params,
  }: {
    children: ReactNode;
    className?: string;
    params: { slug: string };
  }) => (
    <a href={`/e/${params.slug}`} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('../hooks', () => ({
  useHackathonDashboard: () => mocks.dashboard,
}));

afterEach(() => {
  cleanup();
  mocks.dashboard = { data: undefined, isError: false, refetch: vi.fn() };
});

const markets = [
  {
    code: 'DZ',
    slug: 'algeria',
    name: 'Algeria',
    nameAr: 'الجزائر',
    nameFr: 'Algérie',
    timezone: 'Africa/Algiers',
  },
] as never;

const dashboard = (changes: Partial<Dashboard> = {}): Dashboard => ({
  eventId: 'evt_draft',
  slug: 'algiers-builders-weekend',
  marketCode: 'DZ',
  status: 'published',
  capacity: 120,
  schedule: {
    registrationOpensAt: Date.parse('2099-02-01T08:00:00Z'),
    registrationClosesAt: Date.parse('2099-03-10T17:00:00Z'),
    kickoffAt: Date.parse('2099-03-12T08:00:00Z'),
    submissionDeadlineAt: Date.parse('2099-03-14T11:00:00Z'),
    endsAt: Date.parse('2099-03-14T17:00:00Z'),
    judgingEndsAt: Date.parse('2099-03-20T17:00:00Z'),
    phase: 'registration_open',
  },
  counts: {
    registered: 86,
    waitlisted: 4,
    teams: 21,
    submissions: 0,
    judges: 3,
    reviewsDone: 0,
    reviewsExpected: 0,
  },
  ...changes,
});

const renderDashboard = (
  draft: HackathonDraftView = draftView(
    { details: savedDetails, isEditable: true },
    { status: 'published' },
  ),
  locale: Locale = 'en',
) =>
  render(
    <HackathonDashboard
      draft={draft}
      locale={locale}
      timeZone="Africa/Algiers"
      markets={markets}
    />,
  );

const statOf = (label: string) =>
  screen.getByText(label).closest('div')?.textContent;

describe('HackathonDashboard (B-OPS-01)', () => {
  it('shows the phase and every count, with the places there are', () => {
    mocks.dashboard.data = dashboard();
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeTruthy();
    expect(
      screen.getByText('Registration is open until Tue, Mar 10, 18:00.'),
    ).toBeTruthy();
    expect(statOf('Registered')).toBe('Registered86of 120 places');
    expect(statOf('Waitlisted')).toBe('Waitlisted4');
    expect(statOf('Teams')).toBe('Teams21');
    expect(statOf('Submissions')).toBe('Submissions0');
    expect(statOf('Judges')).toBe('Judges3');
    expect(statOf('Reviews done')).toBe('Reviews done0 of 0');
  });

  it('links to the public page, the details and the review status', () => {
    mocks.dashboard.data = dashboard();
    renderDashboard(
      draftView(
        {
          details: savedDetails,
          isEditable: true,
          review: { status: 'approved', note: null, gaps: [] },
        },
        { status: 'published' },
      ),
    );

    expect(
      screen.getByRole('link', { name: 'Public page' }).getAttribute('href'),
    ).toBe('/e/algiers-builders-weekend');
    expect(
      screen
        .getByRole('link', { name: 'Edit the details' })
        .getAttribute('href'),
    ).toBe('#hackathon-details-heading');
    expect(screen.queryByRole('link', { name: 'Go to review' })).toBeNull();
    expect(screen.getByText('Review: approved')).toBeTruthy();
  });

  it('sends a draft to its review, with no public page yet', () => {
    mocks.dashboard.data = dashboard({ status: 'draft' });
    renderDashboard(
      draftView({
        details: savedDetails,
        review: { status: 'rejected', note: 'Add a rule.', gaps: [] },
      }),
    );

    expect(screen.queryByRole('link', { name: 'Public page' })).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Go to review' }).getAttribute('href'),
    ).toBe('#hackathon-review-heading');
    expect(screen.getByText('Review: sent back with a note')).toBeTruthy();
  });

  it('leaves the phase out once the hackathon is cancelled', () => {
    mocks.dashboard.data = dashboard({ status: 'cancelled', capacity: null });
    renderDashboard(
      draftView(
        { details: savedDetails, isEditable: false },
        { status: 'cancelled' },
      ),
    );

    expect(screen.queryByText(/^Registration is open/u)).toBeNull();
    expect(statOf('Registered')).toBe('Registered86');
    expect(screen.queryByRole('link', { name: 'Edit the details' })).toBeNull();
  });

  it('shows nothing before the details are saved', () => {
    const { container } = renderDashboard(draftView());

    expect(container.textContent).toBe('');
  });

  it('says it is loading, and offers to retry when the read fails', () => {
    renderDashboard();
    expect(screen.getByText('Loading the overview…')).toBeTruthy();
    cleanup();

    mocks.dashboard.isError = true;
    renderDashboard();
    expect(screen.getByText('The overview could not be loaded.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.dashboard.refetch).toHaveBeenCalled();
  });

  it('reads in Arabic and in French', () => {
    mocks.dashboard.data = dashboard();
    renderDashboard(undefined, 'ar');
    expect(screen.getByRole('heading', { name: 'نظرة عامة' })).toBeTruthy();
    expect(statOf('المسجّلون')).toBe('المسجّلون86من 120 مقعدًا');
    cleanup();

    renderDashboard(undefined, 'fr');
    expect(statOf('Évaluations faites')).toBe('Évaluations faites0 sur 0');
  });
});
