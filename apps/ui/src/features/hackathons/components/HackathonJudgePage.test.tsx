import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { JudgePageView } from '../api';
import { EVENT_ID, markets } from '../team-page.fixtures';
import { HackathonJudgePage } from './HackathonJudgePage';

const mocks = vi.hoisted(() => ({
  page: {
    data: undefined as unknown,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <a href="/event" className={className}>
      {children}
    </a>
  ),
}));

vi.mock('../judging-hooks', () => ({
  useJudgePage: () => mocks.page,
}));

afterEach(() => {
  cleanup();
  mocks.page = {
    data: undefined,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
});

const judgeView = (changes: Partial<JudgePageView> = {}): JudgePageView => ({
  event: {
    id: EVENT_ID,
    title: 'Algiers Builders Weekend',
    slug: 'algiers-builders-weekend',
    marketCode: 'DZ',
  },
  submissionDeadlineAt: Date.parse('2099-03-14T11:00:00Z'),
  judgingEndsAt: Date.parse('2099-03-21T11:00:00Z'),
  stage: 'judging',
  isJudge: true,
  entries: [
    {
      submissionId: 'sub_ledger',
      teamName: 'Byte Club',
      title: 'Ledger',
      trackTitle: 'Payments',
      state: 'scored',
    },
    {
      submissionId: 'sub_souk',
      teamName: 'Souk Squad',
      title: 'Souk',
      trackTitle: null,
      state: 'to_score',
    },
    {
      submissionId: 'sub_tabib',
      teamName: 'Tabib',
      title: 'Tabib',
      trackTitle: 'Health',
      state: 'recused',
    },
  ],
  progress: { scored: 1, toScore: 1, recused: 1 },
  ...changes,
});

const renderPage = (view: JudgePageView | undefined, locale: Locale = 'en') => {
  mocks.page.data = view;
  return render(
    <HackathonJudgePage eventId={EVENT_ID} locale={locale} markets={markets} />,
  );
};

const entry = (title: string) =>
  screen
    .getByRole('heading', { name: title, level: 3 })
    .closest('li') as HTMLElement;

describe('HackathonJudgePage (B-JDG-06)', () => {
  it('lists every entry as to score, scored or recused, with the judge’s progress', () => {
    renderPage(judgeView());

    expect(
      screen.getByRole('heading', { name: 'Judging', level: 1 }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'You can score the submissions until judging ends, Sat, Mar 21, 12:00.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Scored: 1 of 2')).toBeTruthy();
    expect(screen.getByText('Recused: 1')).toBeTruthy();
    expect(within(entry('Ledger')).getByText('Scored')).toBeTruthy();
    expect(within(entry('Ledger')).getByText('Payments')).toBeTruthy();
    expect(within(entry('Souk')).getByText('To score')).toBeTruthy();
    expect(within(entry('Tabib')).getByText('Recused')).toBeTruthy();
  });

  it('says so when no team has submitted', () => {
    renderPage(
      judgeView({
        entries: [],
        progress: { scored: 0, toScore: 0, recused: 0 },
      }),
    );

    expect(screen.getByText('No team has submitted a project.')).toBeTruthy();
    expect(screen.queryByText(/Scored:/)).toBeNull();
  });

  it('tells a member who does not judge, and a judge before and after judging, where things stand', () => {
    const view = renderPage(judgeView({ isJudge: false, entries: [] }));
    expect(
      screen.getByText('Only this hackathon’s judges see its submissions.'),
    ).toBeTruthy();

    mocks.page.data = judgeView({ stage: 'not_started', entries: [] });
    view.rerender(
      <HackathonJudgePage eventId={EVENT_ID} locale="en" markets={markets} />,
    );
    expect(
      screen.getByText(
        'Judging opens when submissions close, Sat, Mar 14, 12:00.',
      ),
    ).toBeTruthy();

    mocks.page.data = judgeView({ stage: 'closed', entries: [] });
    view.rerender(
      <HackathonJudgePage eventId={EVENT_ID} locale="en" markets={markets} />,
    );
    expect(
      screen.getByText('Judging has closed, so scores can no longer change.'),
    ).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('reads in Arabic', () => {
    renderPage(judgeView(), 'ar');

    expect(
      screen.getByRole('heading', { name: 'التحكيم', level: 1 }),
    ).toBeTruthy();
    expect(within(entry('Souk')).getByText('بانتظار التقييم')).toBeTruthy();
  });

  it('offers a retry when the page cannot load', () => {
    mocks.page.isError = true;
    mocks.page.error = new Error('offline');
    renderPage(undefined);

    expect(screen.getByText('The submissions could not be loaded.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });
});
