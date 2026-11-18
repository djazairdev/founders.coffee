import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

import type { HackathonResultsEntry, HackathonResultsView } from '../api';
import { EVENT_ID, mutation } from '../team-page.fixtures';
import { HackathonResultsPanel } from './HackathonResultsPanel';

const mocks = vi.hoisted(() => ({
  query: {
    data: undefined as unknown,
    isError: false,
    refetch: vi.fn(),
  },
  publish: undefined as
    ReturnType<typeof import('../team-page.fixtures').mutation> | undefined,
}));

vi.mock('../results-hooks', () => ({
  useHackathonResults: () => mocks.query,
  usePublishHackathonResults: () => {
    mocks.publish ??= mutation();
    return mocks.publish;
  },
}));

afterEach(() => {
  cleanup();
  mocks.query = { data: undefined, isError: false, refetch: vi.fn() };
  mocks.publish = undefined;
});

const entry = (
  submissionId: string,
  title: string,
  rank: number | null,
  changes: Partial<HackathonResultsEntry> = {},
): HackathonResultsEntry => ({
  submissionId,
  teamName: `${title} team`,
  title,
  trackTitle: 'Payments',
  total: rank === null ? null : 87.5,
  rank,
  trackRank: rank,
  isTied: false,
  tieNote: null,
  isDisqualified: false,
  ...changes,
});

const resultsView = (
  changes: Partial<HackathonResultsView> = {},
): HackathonResultsView => ({
  stage: 'open',
  judgingEndsAt: Date.parse('2099-03-21T11:00:00Z'),
  publishedAt: null,
  entries: [entry('sub_a', 'Ledger', 1)],
  missingEntries: [],
  tiedGroups: [],
  ...changes,
});

const renderPanel = (
  view: HackathonResultsView | undefined,
  locale: Locale = 'en',
) => {
  mocks.query.data = view;
  return render(
    <HackathonResultsPanel
      eventId={EVENT_ID}
      locale={locale}
      timeZone="Africa/Algiers"
    />,
  );
};

const pressPublish = () =>
  fireEvent.click(
    screen.getAllByRole('button', {
      name: 'Publish results',
      hidden: true,
    })[0] as HTMLElement,
  );

const confirmPublish = () =>
  fireEvent.click(
    screen.getAllByRole('button', {
      name: 'Publish results',
      hidden: true,
    })[1] as HTMLElement,
  );

const tie = () =>
  resultsView({
    entries: [
      entry('sub_a', 'Ledger', 1, { isTied: true }),
      entry('sub_b', 'Souk', 1, { isTied: true }),
      entry('sub_c', 'Tabib', 3),
    ],
    tiedGroups: [['sub_a', 'sub_b']],
  });

describe('HackathonResultsPanel (B-JDG-09)', () => {
  it('says when publishing opens, before judging ends', () => {
    renderPanel(resultsView({ stage: 'waiting', entries: [] }));

    expect(
      screen.getByText(/You can publish the results once judging ends/u),
    ).toBeTruthy();
    expect(screen.queryByText('Publish results')).toBeNull();
  });

  it('shows the ranking and publishes only after the last check', () => {
    renderPanel(resultsView());

    expect(screen.getByText('Rank 1')).toBeTruthy();
    expect(screen.getByText('87.5 / 100')).toBeTruthy();
    expect(screen.getByText(/Track rank 1/u)).toBeTruthy();

    pressPublish();
    expect(mocks.publish?.mutate).not.toHaveBeenCalled();
    expect(screen.getByText('Publish the results?')).toBeTruthy();

    confirmPublish();
    expect(mocks.publish?.mutate).toHaveBeenCalledWith({
      eventId: EVENT_ID,
      missingScoresReason: '',
      tieOrder: [],
    });
  });

  it('takes the organiser to the reason when scores are missing, and sends it', () => {
    renderPanel(resultsView({ missingEntries: ['sub_a'] }));

    expect(screen.getByText('Submissions with missing scores: 1')).toBeTruthy();
    pressPublish();
    const reason = screen.getByLabelText('Why publish with scores missing?');
    expect(
      screen.getByText('Write the reason scores are missing.'),
    ).toBeTruthy();
    expect(document.activeElement).toBe(reason);
    expect(
      screen.queryByText('Publish the results?')?.closest('dialog')?.open,
    ).toBeFalsy();

    fireEvent.change(reason, { target: { value: 'A judge fell ill.' } });
    expect(
      screen.queryByText('Write the reason scores are missing.'),
    ).toBeNull();
    pressPublish();
    confirmPublish();
    expect(mocks.publish?.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ missingScoresReason: 'A judge fell ill.' }),
    );
  });

  it('lets the organiser order a tie and sends that order', () => {
    renderPanel(tie());

    expect(screen.getByText('Ties to settle')).toBeTruthy();
    expect(screen.getAllByText('Tied')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Move Souk up' }));
    pressPublish();
    expect(
      screen.getByText(/Tied submissions stay in the order you set/u),
    ).toBeTruthy();
    confirmPublish();

    expect(mocks.publish?.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ tieOrder: ['sub_b', 'sub_a'] }),
    );
  });

  it('does nothing when an entry at the end of a tie is moved further', () => {
    renderPanel(tie());

    fireEvent.click(screen.getByRole('button', { name: 'Move Ledger up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move Souk down' }));
    pressPublish();
    confirmPublish();

    expect(mocks.publish?.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ tieOrder: ['sub_a', 'sub_b'] }),
    );
  });

  it('says why a publication was refused', () => {
    mocks.publish = mutation();
    mocks.publish.error = new AppError('tie_pick_required', 'Ties changed');
    renderPanel(resultsView());

    expect(screen.getByText(/The ties changed/u)).toBeTruthy();
  });

  it('tells the organiser an entry was disqualified after the results and its prize is theirs to decide', () => {
    renderPanel(
      resultsView({
        stage: 'published',
        publishedAt: Date.parse('2099-03-22T11:00:00Z'),
        entries: [entry('sub_a', 'Ledger', 1, { isDisqualified: true })],
      }),
    );

    expect(screen.getByText(/Disqualified after the results\./u)).toBeTruthy();
    expect(screen.getByText(/yours to decide/u)).toBeTruthy();
  });

  it('shows the frozen results once published, with no way to publish again', () => {
    renderPanel(
      resultsView({
        stage: 'published',
        publishedAt: Date.parse('2099-03-22T11:00:00Z'),
        entries: [
          entry('sub_a', 'Ledger', 1, { tieNote: 'organiser_pick' }),
          entry('sub_b', 'Souk', null),
        ],
      }),
    );

    expect(screen.getByText(/They can no longer change/u)).toBeTruthy();
    expect(screen.getByText('Tie settled by the organiser.')).toBeTruthy();
    expect(screen.getByText('Not ranked')).toBeTruthy();
    expect(screen.queryByText('Publish results')).toBeNull();
  });

  it('says so when no team submitted, with no way to publish', () => {
    renderPanel(resultsView({ entries: [] }));

    expect(screen.getByText(/there are no results to publish/u)).toBeTruthy();
    expect(screen.queryByText('Publish results')).toBeNull();
  });

  it('renders nothing for a hackathon that cannot publish', () => {
    const { container } = renderPanel(
      resultsView({ stage: 'unavailable', entries: [] }),
    );

    expect(container.innerHTML).toBe('');
  });

  it('shows loading, then a retry when the results cannot load', () => {
    renderPanel(undefined);
    expect(screen.getByText('Loading the results…')).toBeTruthy();
    cleanup();

    mocks.query.isError = true;
    renderPanel(undefined);
    expect(screen.getByText('The results could not be loaded.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.query.refetch).toHaveBeenCalled();
  });

  it('moves focus to the published message once the button is gone (#471)', () => {
    const view = renderPanel(resultsView());
    screen.getByRole('button', { name: 'Publish results' }).focus();

    mocks.query.data = resultsView({
      stage: 'published',
      publishedAt: Date.parse('2099-03-22T11:00:00Z'),
    });
    view.rerender(
      <HackathonResultsPanel
        eventId={EVENT_ID}
        locale="en"
        timeZone="Africa/Algiers"
      />,
    );

    expect(document.activeElement?.textContent).toContain('published');
  });

  it('reads in Arabic', () => {
    renderPanel(tie(), 'ar');

    expect(screen.getByRole('heading', { name: 'النتائج' })).toBeTruthy();
    expect(screen.getByText('تعادلات يجب حسمها')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'نقل Souk إلى الأعلى' }),
    ).toBeTruthy();
  });
});
