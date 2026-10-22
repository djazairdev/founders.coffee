import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { HackathonDraftView } from '../api';
import { draftView } from '../hackathon-details-form.fixtures';
import { HackathonReviewBanner } from './HackathonReviewBanner';

const review = (
  changes: Partial<HackathonDraftView['review']>,
): HackathonDraftView['review'] => ({
  status: 'draft',
  note: null,
  gaps: [],
  ...changes,
});

const renderBanner = (draft: HackathonDraftView, locale: Locale = 'en') =>
  render(<HackathonReviewBanner draft={draft} locale={locale} />);

afterEach(cleanup);

describe('HackathonReviewBanner (B-HKN-16)', () => {
  it('says a draft is private until it is sent for review', () => {
    renderBanner(draftView());

    expect(
      screen.getByText(
        'Draft. Only your organisation can see it. When it is complete, send it for review below.',
      ),
    ).toBeTruthy();
  });

  it('says a hackathon with the reviewers is waiting for their decision', () => {
    renderBanner(draftView({ review: review({ status: 'submitted' }) }));

    expect(screen.getByText(/^Sent for review\./u)).toBeTruthy();
  });

  it('shows the reviewers’ note on one they sent back', () => {
    renderBanner(
      draftView({
        review: review({
          status: 'rejected',
          note: 'Name your judges.\nAnd how teams form.',
        }),
      }),
    );

    expect(
      screen.getByText(
        'The reviewers sent it back. Change it as their note says, then send it again.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Their note')).toBeTruthy();
    expect(screen.getByText(/^Name your judges\./u)).toBeTruthy();
  });

  it('says an approved hackathon is published', () => {
    renderBanner(
      draftView(
        { review: review({ status: 'approved' }), isEditable: false },
        { status: 'published' },
      ),
    );

    expect(
      screen.getByText('Approved and published. Anyone can find it now.'),
    ).toBeTruthy();
  });

  it('says nothing for a cancelled hackathon, or a draft that can no longer change', () => {
    const cancelled = renderBanner(
      draftView(
        { review: review({ status: 'approved' }) },
        { status: 'cancelled' },
      ),
    );
    expect(cancelled.container.innerHTML).toBe('');
    cleanup();

    const locked = renderBanner(draftView({ isEditable: false }));
    expect(locked.container.innerHTML).toBe('');
  });

  it('reads in Arabic and French', () => {
    renderBanner(draftView(), 'ar');
    expect(screen.getByText(/^مسودة\./u)).toBeTruthy();
    cleanup();

    renderBanner(
      draftView(
        { review: review({ status: 'approved' }) },
        { status: 'published' },
      ),
      'fr',
    );
    expect(screen.getByText(/^Approuvé et publié\./u)).toBeTruthy();
  });
});
