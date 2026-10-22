import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { draftView } from '../hackathon-details-form.fixtures';
import {
  getManagePageMocks,
  renderManagePage as renderPage,
  resetManagePage,
} from './HackathonManagePage.fixtures';

const mocks = getManagePageMocks();

afterEach(resetManagePage);

describe('HackathonManagePage (B-HKN-12)', () => {
  it('shows a hackathon that moved on without the form', () => {
    mocks.draft.data = draftView(
      { isEditable: false },
      { status: 'published' },
    );
    renderPage();

    expect(
      screen.getByText(
        'These details can no longer be changed: the hackathon is cancelled, with the reviewers, or over.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('answers a hackathon the reader does not organise as not found', () => {
    mocks.draft.isError = true;
    mocks.draft.error = { code: 'forbidden' };
    renderPage();
    expect(
      screen.getByText(
        'This hackathon was not found, or you do not organise it.',
      ),
    ).toBeTruthy();
    cleanup();

    mocks.draft.error = { code: 'hackathons_disabled' };
    renderPage();
    expect(
      screen.getByText('Hackathons aren’t open in this country yet.'),
    ).toBeTruthy();
  });

  it('reads in Arabic', () => {
    mocks.draft.data = draftView();
    renderPage('ar');

    expect(
      screen.getByRole('heading', { name: 'القواعد وشروط المشاركة' }),
    ).toBeTruthy();
    expect(screen.getByLabelText('بدء التسجيل')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeTruthy();
  });

  it('shows a hackathon with the reviewers as in review, instead of the forms', () => {
    mocks.draft.data = draftView({
      isEditable: false,
      review: { status: 'submitted', note: null, gaps: [] },
    });
    renderPage();

    expect(screen.getByText('In review')).toBeTruthy();
    expect(screen.getByText(/^Sent for review\./)).toBeTruthy();
    expect(screen.queryByText(/can no longer be changed/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });
});
