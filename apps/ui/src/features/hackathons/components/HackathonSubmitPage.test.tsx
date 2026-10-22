import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

import type { SubmissionPageView } from '../api';
import {
  OPEN_SOURCE_TRACK_ID,
  submissionView,
  TRACK_ID,
} from '../submission-page.fixtures';
import { EVENT_ID, markets, mutation } from '../team-page.fixtures';
import { HackathonSubmitPage } from './HackathonSubmitPage';

const mocks = vi.hoisted(() => ({
  page: {
    data: undefined as unknown,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  save: undefined as
    ReturnType<typeof import('../team-page.fixtures').mutation> | undefined,
  send: undefined as
    ReturnType<typeof import('../team-page.fixtures').mutation> | undefined,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
    to,
    params,
  }: {
    children: ReactNode;
    className?: string;
    to: string;
    params: Record<string, string>;
  }) => (
    <a
      href={Object.entries(params).reduce(
        (href, [key, value]) => href.replace(`$${key}`, value),
        to,
      )}
      className={className}
    >
      {children}
    </a>
  ),
}));

vi.mock('../submission-hooks', () => ({
  useSubmissionPage: () => mocks.page,
  useSaveSubmissionDraft: () => {
    mocks.save ??= mutation();
    return mocks.save;
  },
  useSubmitSubmission: () => {
    mocks.send ??= mutation();
    return mocks.send;
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
  mocks.send = undefined;
});

const renderPage = (
  view: SubmissionPageView | undefined,
  locale: Locale = 'en',
) => {
  mocks.page.data = view;
  return render(
    <HackathonSubmitPage
      eventId={EVENT_ID}
      locale={locale}
      markets={markets}
    />,
  );
};

const field = (name: string) =>
  screen.getByLabelText(name, { exact: false }) as HTMLInputElement;

const trackSelect = () =>
  screen.getByLabelText('Track') as unknown as HTMLSelectElement;

describe('HackathonSubmitPage (B-SUB-05)', () => {
  it('fills the form with the team’s saved project and says until when it can change', () => {
    renderPage(submissionView());

    expect(
      screen.getByRole('heading', { name: 'Your team’s project', level: 1 }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Your team can change its project until submissions close, Sat, Mar 14, 12:00.',
      ),
    ).toBeTruthy();
    expect(trackSelect().value).toBe(TRACK_ID);
    expect(field('Project name').value).toBe('Ledger');
    expect(field('Code repository').value).toBe(
      'https://github.com/byte-club/ledger',
    );
    expect(
      screen.queryByLabelText('Pull requests', { exact: false }),
    ).toBeNull();
  });

  it('saves the project at the version the captain saw, keeping the AI answers', () => {
    renderPage(submissionView());

    fireEvent.change(field('Demo video'), {
      target: { value: 'https://youtu.be/ledger' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.save?.mutate).toHaveBeenCalledWith(
      {
        version: 3,
        draft: {
          trackId: TRACK_ID,
          title: 'Ledger',
          description: 'A ledger a corner shop keeps on its phone.',
          repositoryUrl: 'https://github.com/byte-club/ledger',
          demoVideoUrl: 'https://youtu.be/ledger',
          pullRequestUrls: [],
          aiTools: ['Copilot'],
          aiStatement: 'We used Copilot for tests only.',
        },
      },
      expect.anything(),
    );
  });

  it('asks for pull requests on the open-source track, one link per line', () => {
    renderPage(submissionView({}, null));

    fireEvent.change(screen.getByLabelText('Track'), {
      target: { value: OPEN_SOURCE_TRACK_ID },
    });
    fireEvent.change(field('Project name'), { target: { value: 'Patches' } });
    fireEvent.change(field('Pull requests'), {
      target: {
        value:
          'https://github.com/djazairdev/founders.coffee/pull/1\n\n https://github.com/djazairdev/founders.coffee/pull/2 ',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.save?.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 0,
        draft: expect.objectContaining({
          trackId: OPEN_SOURCE_TRACK_ID,
          pullRequestUrls: [
            'https://github.com/djazairdev/founders.coffee/pull/1',
            'https://github.com/djazairdev/founders.coffee/pull/2',
          ],
          aiTools: [],
          aiStatement: null,
        }),
      }),
      expect.anything(),
    );
  });

  it('names what holds a field back and focuses it, without saving', () => {
    renderPage(submissionView());

    fireEvent.change(field('Project name'), { target: { value: ' ' } });
    fireEvent.change(field('Code repository'), {
      target: { value: 'http://github.com/byte-club/ledger' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      screen.getByText('Give the project a name of up to 100 characters.'),
    ).toBeTruthy();
    expect(
      screen.getByText('Use a full link that starts with https://.'),
    ).toBeTruthy();
    expect(document.activeElement).toBe(field('Project name'));
    expect(mocks.save?.mutate).not.toHaveBeenCalled();
  });

  it('says why a save was refused', () => {
    mocks.save = {
      ...mutation(),
      isError: true,
      error: new AppError('submission_conflict', 'Changed'),
    };
    renderPage(submissionView());

    expect(
      screen.getByText(
        'The project changed in another window. Check it, then save again.',
      ),
    ).toBeTruthy();
  });

  it('shows a member who is not captain the project without letting them change it', () => {
    renderPage(
      submissionView({
        team: { id: 'tea_byte', name: 'Byte Club', isCaptain: false },
      }),
    );

    expect(
      screen.getByText('Only your team’s captain can change the project.'),
    ).toBeTruthy();
    expect(field('Project name').readOnly).toBe(true);
    expect(trackSelect().disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('keeps the project read-only before kickoff and once submissions close', () => {
    renderPage(submissionView({ stage: 'not_started' }));
    expect(screen.getByText(/when the hackathon begins/u)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    cleanup();

    renderPage(submissionView({ stage: 'closed' }));
    expect(
      screen.getByText(
        'Submissions have closed, so the project can no longer change.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('sends someone with no team to their team page, and says why to anyone not registered', () => {
    renderPage(submissionView({ team: null, tracks: [] }, null));
    expect(screen.getByText(/^Start or join a team first/u)).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Go to your team' })
        .getAttribute('href'),
    ).toBe(`/en/hackathon/${EVENT_ID}/team`);
    cleanup();

    renderPage(submissionView({ registration: null, team: null }, null));
    expect(screen.getByText(/^Register for this hackathon/u)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('shows loading, then an error with a retry', () => {
    renderPage(undefined);
    expect(screen.getByText('Loading your team’s project…')).toBeTruthy();
    cleanup();

    mocks.page.isError = true;
    mocks.page.error = new Error('down');
    renderPage(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.page.refetch).toHaveBeenCalled();
  });

  it('reads in Arabic', () => {
    renderPage(submissionView(), 'ar');

    expect(screen.getByRole('heading', { name: 'مشروع فريقك' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeTruthy();
  });
});
