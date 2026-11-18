import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

import type { JudgeEntryPageView } from '../api';
import {
  CRAFT,
  entryView,
  IMPACT,
  SUBMISSION_ID,
} from '../judge-entry-page.fixtures';
import { EVENT_ID, markets, mutation } from '../team-page.fixtures';
import { HackathonJudgeEntryPage } from './HackathonJudgeEntryPage';

const mocks = vi.hoisted(() => ({
  page: {
    data: undefined as unknown,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  save: undefined as
    ReturnType<typeof import('../team-page.fixtures').mutation> | undefined,
  recuse: undefined as
    ReturnType<typeof import('../team-page.fixtures').mutation> | undefined,
  list: undefined as unknown,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <a href="/judge" className={className}>
      {children}
    </a>
  ),
}));

vi.mock('../judging-hooks', () => ({
  useJudgeEntryPage: () => mocks.page,
  useJudgePage: () => ({ data: mocks.list }),
  useSaveJudgeScores: () => {
    mocks.save ??= mutation();
    return mocks.save;
  },
  useRecuseFromEntry: () => {
    mocks.recuse ??= mutation();
    return mocks.recuse;
  },
}));

afterEach(() => {
  cleanup();
  mocks.page = {
    data: undefined,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.save = undefined;
  mocks.recuse = undefined;
});

const renderPage = (
  view: JudgeEntryPageView | undefined,
  locale: Locale = 'en',
) => {
  mocks.page.data = view;
  return render(
    <HackathonJudgeEntryPage
      eventId={EVENT_ID}
      submissionId={SUBMISSION_ID}
      locale={locale}
      markets={markets}
    />,
  );
};

const scale = (name: string) => within(screen.getByRole('group', { name }));

const score = (name: string, value: string) =>
  fireEvent.click(scale(name).getByRole('radio', { name: value }));

const saveScores = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Save scores' }));

describe('HackathonJudgeEntryPage (B-JDG-07)', () => {
  it('shows the links and statements, each link opening safely on its own', () => {
    renderPage(entryView());

    expect(screen.getByRole('heading', { name: 'Ledger' })).toBeTruthy();
    expect(screen.getByText('Byte Club')).toBeTruthy();
    expect(screen.getByText('Payments')).toBeTruthy();
    expect(
      screen.getByText('A ledger a corner shop keeps on its phone.'),
    ).toBeTruthy();
    expect(screen.getByText('We used Copilot for tests only.')).toBeTruthy();
    expect(screen.getByText('Copilot')).toBeTruthy();
    for (const url of [
      'https://github.com/byte-club/ledger',
      'https://videos.example/ledger',
      'https://github.com/acme/ledger/pull/7',
    ]) {
      const link = screen.getByRole('link', { name: url });
      expect(link.getAttribute('href')).toBe(url);
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('gives each criterion its description and a scale as long as its own', () => {
    renderPage(entryView());

    expect(screen.getByText('Who it helps.')).toBeTruthy();
    expect(screen.getByText('Score from 1 to 10. Weight: 60%.')).toBeTruthy();
    expect(scale('Impact').getAllByRole('radio')).toHaveLength(10);
    expect(scale('Craft').getAllByRole('radio')).toHaveLength(5);
  });

  it('saves a score per criterion with its comment', () => {
    renderPage(entryView());

    score('Impact', '8');
    score('Craft', '3');
    fireEvent.change(scale('Craft').getByRole('textbox'), {
      target: { value: 'Clean code.' },
    });
    saveScores();

    expect(mocks.save?.mutate).toHaveBeenCalledWith(
      {
        eventId: EVENT_ID,
        submissionId: SUBMISSION_ID,
        scores: [
          { criterionId: IMPACT, value: 8, comment: '' },
          { criterionId: CRAFT, value: 3, comment: 'Clean code.' },
        ],
      },
      expect.anything(),
    );
  });

  it('opens with the scores the judge saved, and tells them once saved again', () => {
    mocks.save = mutation();
    mocks.save.mutate.mockImplementation(
      (_input: unknown, handlers: { onSuccess: () => void }) =>
        handlers.onSuccess(),
    );
    renderPage(
      entryView({
        scores: [
          { criterionId: IMPACT, value: 8, comment: 'Useful.' },
          { criterionId: CRAFT, value: 3, comment: null },
        ],
      }),
    );

    expect(
      (scale('Impact').getByRole('radio', { name: '8' }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      (scale('Impact').getByRole('textbox') as HTMLTextAreaElement).value,
    ).toBe('Useful.');
    saveScores();

    expect(screen.getByText(/Your scores are saved/u)).toBeTruthy();
    score('Impact', '9');
    expect(screen.queryByText(/Your scores are saved/u)).toBeNull();
  });

  it('saves nothing with a criterion unscored and takes the judge to it', () => {
    renderPage(entryView());

    score('Impact', '8');
    saveScores();

    expect(mocks.save?.mutate).not.toHaveBeenCalled();
    expect(screen.getAllByText('Choose a score.')).toHaveLength(1);
    expect(document.activeElement).toBe(
      scale('Craft').getByRole('radio', { name: '1' }),
    );
    score('Craft', '2');
    expect(screen.queryByText('Choose a score.')).toBeNull();
  });

  it('says why a save was refused', () => {
    mocks.save = mutation();
    mocks.save.error = new AppError('judging_closed', 'Judging is closed');
    renderPage(entryView());

    expect(
      screen.getByText('Judging has closed, so scores can no longer change.'),
    ).toBeTruthy();
  });

  it('recuses only with a reason', () => {
    renderPage(entryView());
    const reason = screen.getByLabelText('Reason');
    const recuse = screen.getByRole('button', { name: 'Recuse' });

    fireEvent.change(reason, { target: { value: '   ' } });
    fireEvent.click(recuse);
    expect(mocks.recuse?.mutate).not.toHaveBeenCalled();
    expect(screen.getByText('Say why you are recusing.')).toBeTruthy();
    expect(document.activeElement).toBe(reason);

    fireEvent.change(reason, { target: { value: 'I mentored this team.' } });
    expect(screen.queryByText('Say why you are recusing.')).toBeNull();
    fireEvent.click(recuse);
    expect(mocks.recuse?.mutate).toHaveBeenCalledWith({
      eventId: EVENT_ID,
      submissionId: SUBMISSION_ID,
      reason: 'I mentored this team.',
    });
  });

  it('points the judge to the next submission still to score', () => {
    mocks.list = {
      entries: [
        { submissionId: 'sub_done', title: 'Ledger', state: 'scored' },
        { submissionId: 'sub_next', title: 'Souk', state: 'to_score' },
      ],
    };
    renderPage(entryView());

    expect(screen.getByRole('link', { name: 'Souk' })).toBeTruthy();
    mocks.list = undefined;
  });

  it('tells a judge who recused, and shows them neither the submission nor the form', () => {
    renderPage(
      entryView({ isRecused: true, entry: null, criteria: [], scores: [] }),
    );

    expect(screen.getByText(/You recused yourself/u)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save scores' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Recuse' })).toBeNull();
    expect(screen.getByRole('link', { name: 'All submissions' })).toBeTruthy();
  });

  it('says so when the submission is not there, or the hackathon has no criteria', () => {
    renderPage(entryView({ entry: null }));
    expect(screen.getByText('This submission is not available.')).toBeTruthy();
    cleanup();

    renderPage(entryView({ criteria: [] }));
    expect(
      screen.getByText('This hackathon has no scoring criteria yet.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save scores' })).toBeNull();
  });

  it('tells a non-judge and a closed judging, with nothing to score', () => {
    renderPage(entryView({ isJudge: false, entry: null, criteria: [] }));
    expect(
      screen.getByText('Only this hackathon’s judges see its submissions.'),
    ).toBeTruthy();
    cleanup();

    renderPage(entryView({ stage: 'closed', entry: null, criteria: [] }));
    expect(
      screen.getByText('Judging has closed, so scores can no longer change.'),
    ).toBeTruthy();
  });

  it('offers a retry when the page cannot load', () => {
    mocks.page.isError = true;
    mocks.page.error = new Error('offline');
    renderPage(undefined);

    expect(
      screen.getByText('The submissions could not be loaded.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('reads in Arabic', () => {
    renderPage(entryView(), 'ar');

    expect(screen.getByRole('button', { name: 'حفظ العلامات' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'التنحي' })).toBeTruthy();
  });
});
