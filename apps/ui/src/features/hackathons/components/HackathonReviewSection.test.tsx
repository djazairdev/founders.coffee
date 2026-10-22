import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

import type { HackathonDraftView } from '../api';
import { draftView } from '../hackathon-details-form.fixtures';
import { HackathonReviewSection } from './HackathonReviewSection';

const mocks = vi.hoisted(() => ({
  submit: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
  },
}));

vi.mock('../hooks', () => ({
  useSubmitHackathonForReview: () => mocks.submit,
}));

const review = (
  changes: Partial<HackathonDraftView['review']>,
): HackathonDraftView['review'] => ({
  status: 'draft',
  note: null,
  gaps: [],
  ...changes,
});

const renderSection = (draft: HackathonDraftView, locale: Locale = 'en') =>
  render(
    <HackathonReviewSection
      draft={draft}
      locale={locale}
      timeZone="Africa/Algiers"
    />,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Object.assign(mocks.submit, {
    isPending: false,
    isError: false,
    error: null,
  });
});

describe('HackathonReviewSection (B-HKN-08, B-HKN-16)', () => {
  it('links what is missing and holds the button back until it is done', () => {
    renderSection(
      draftView({ review: review({ gaps: ['tracks', 'rubric'] }) }),
    );

    expect(screen.getByText('Its rules and who can take part')).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'At least one track' })
        .getAttribute('href'),
    ).toBe('#hackathon-tracks-heading');
    expect(
      screen
        .getByRole('link', { name: 'A rubric whose weights add up to 100' })
        .getAttribute('href'),
    ).toBe('#hackathon-rubric-heading');
    const button = screen.getByRole('button', { name: 'Send for review' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('aria-describedby')).toBe(
      'hackathon-review-unready',
    );
  });

  it('sends a complete hackathon on the version the organiser saw', () => {
    renderSection(draftView({ version: 4, review: review({}) }));

    fireEvent.click(screen.getByRole('button', { name: 'Send for review' }));

    expect(mocks.submit.mutate).toHaveBeenCalledWith({
      eventId: 'evt_draft',
      version: 4,
    });
    expect(
      screen.queryByRole('link', { name: 'At least one track' }),
    ).toBeNull();
  });

  it('lets the organisers send one the reviewers sent back again, leaving the note to the banner', () => {
    renderSection(
      draftView({
        review: review({ status: 'rejected', note: 'Name your judges.' }),
      }),
    );

    expect(screen.queryByText('Name your judges.')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Send for review' }),
    ).toBeTruthy();
  });

  it('shows what was sent while it is with the reviewers, with nothing to press', () => {
    renderSection(draftView({ review: review({ status: 'submitted' }) }));

    expect(
      screen.getByRole('heading', { name: 'What you are sending' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows nothing once the hackathon is published', () => {
    const view = renderSection(
      draftView(
        { review: review({ status: 'approved' }) },
        { status: 'published' },
      ),
    );

    expect(view.container.innerHTML).toBe('');
  });

  it('explains a refusal in the organiser’s words', () => {
    Object.assign(mocks.submit, {
      isError: true,
      error: new AppError('hackathon_incomplete', 'Incomplete'),
    });
    renderSection(draftView({ review: review({}) }));

    expect(
      screen.getByText('Something is still missing. Check the list above.'),
    ).toBeTruthy();
  });

  it('reads in Arabic', () => {
    renderSection(draftView({ review: review({ gaps: ['tracks'] }) }), 'ar');

    expect(
      screen.getByRole('heading', { name: 'إرسال للمراجعة' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'مسار واحد على الأقل' }),
    ).toBeTruthy();
  });
});
