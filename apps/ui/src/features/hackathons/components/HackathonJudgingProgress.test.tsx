import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

import type { JudgingProgressView } from '../api';
import { EVENT_ID, mutation } from '../team-page.fixtures';
import { HackathonJudgingProgress } from './HackathonJudgingProgress';

const mocks = vi.hoisted(() => ({
  query: { data: undefined as unknown, isError: false, refetch: vi.fn() },
  remind: undefined as
    ReturnType<typeof import('../team-page.fixtures').mutation> | undefined,
}));

vi.mock('../results-hooks', () => ({
  useHackathonJudgingProgress: () => mocks.query,
  useRemindHackathonJudges: () => {
    mocks.remind ??= mutation();
    return mocks.remind;
  },
}));

afterEach(() => {
  cleanup();
  mocks.query = { data: undefined, isError: false, refetch: vi.fn() };
  mocks.remind = undefined;
});

const judging = (
  changes: Partial<JudgingProgressView> = {},
): JudgingProgressView => ({
  stage: 'judging',
  entries: 3,
  judges: [
    {
      judgeId: 'jdg_a',
      name: 'Yasmine',
      progress: { scored: 1, toScore: 1, recused: 1 },
    },
    {
      judgeId: 'jdg_b',
      name: 'Karim',
      progress: { scored: 3, toScore: 0, recused: 0 },
    },
  ],
  ...changes,
});

const renderPanel = (
  view: JudgingProgressView | undefined,
  locale: Locale = 'en',
) => {
  mocks.query.data = view;
  return render(
    <HackathonJudgingProgress eventId={EVENT_ID} locale={locale} />,
  );
};

const remindButton = () =>
  screen.queryByRole('button', { name: 'Remind judges' });

describe('HackathonJudgingProgress (B-JDG-08)', () => {
  it('shows what each judge scored, still owes and recused from', () => {
    renderPanel(judging());

    expect(screen.getByText('Scored: 1 of 2')).toBeTruthy();
    expect(screen.getByText('Missing: 1')).toBeTruthy();
    expect(screen.getByText('Recused: 1')).toBeTruthy();
    expect(screen.getByText('Scored: 3 of 3')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
  });

  it('reminds judges and says how many it reached', () => {
    mocks.remind = mutation();
    renderPanel(judging());

    fireEvent.click(remindButton() as HTMLElement);
    expect(mocks.remind.mutate).toHaveBeenCalled();
    cleanup();

    mocks.remind.data = { reminded: 2, alreadyReminded: 0 };
    renderPanel(judging());
    expect(screen.getByText('Judges reminded: 2')).toBeTruthy();
  });

  it('says when nobody was due a reminder', () => {
    mocks.remind = mutation();
    mocks.remind.data = { reminded: 0, alreadyReminded: 1 };
    renderPanel(judging());

    expect(screen.getByText(/already reminded/u)).toBeTruthy();
  });

  it('says why a reminder was refused', () => {
    mocks.remind = mutation();
    mocks.remind.error = new AppError('judging_closed', 'Closed');
    renderPanel(judging());

    expect(screen.getByText(/Judging has closed/u)).toBeTruthy();
  });

  it('offers no reminder once every judge finished, or judging closed', () => {
    renderPanel(
      judging({
        judges: [
          {
            judgeId: 'jdg_b',
            name: 'Karim',
            progress: { scored: 3, toScore: 0, recused: 0 },
          },
        ],
      }),
    );
    expect(remindButton()).toBeNull();
    cleanup();

    renderPanel(judging({ stage: 'closed' }));
    expect(screen.getByText('Scored: 1 of 2')).toBeTruthy();
    expect(remindButton()).toBeNull();
  });

  it('shows nothing before judging opens', () => {
    const { container } = renderPanel(judging({ stage: 'not_started' }));

    expect(container.innerHTML).toBe('');
  });

  it('says when no judge accepted, or no team submitted', () => {
    renderPanel(judging({ judges: [] }));
    expect(screen.getByText('No judge has accepted yet.')).toBeTruthy();
    cleanup();

    renderPanel(judging({ entries: 0 }));
    expect(screen.getByText('No team has submitted a project.')).toBeTruthy();
    expect(remindButton()).toBeNull();
  });

  it('shows loading, then a retry when progress cannot load', () => {
    renderPanel(undefined);
    expect(screen.getByText('Loading judging progress…')).toBeTruthy();
    cleanup();

    mocks.query.isError = true;
    renderPanel(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.query.refetch).toHaveBeenCalled();
  });

  it('reads in Arabic', () => {
    renderPanel(judging(), 'ar');

    expect(screen.getByRole('heading', { name: 'تقدّم التحكيم' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'تذكير الحكام' })).toBeTruthy();
  });
});
