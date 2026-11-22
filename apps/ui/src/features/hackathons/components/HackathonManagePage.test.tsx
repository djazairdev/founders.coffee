import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { draftView } from '../hackathon-details-form.fixtures';
import {
  getManagePageMocks,
  renderManagePage as renderPage,
  resetManagePage,
} from './HackathonManagePage.fixtures';

const mocks = getManagePageMocks();

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: () => document.querySelector('dialog')?.setAttribute('open', ''),
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: () => document.querySelector('dialog')?.removeAttribute('open'),
  });
});

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

  it('requires confirmation before deleting and explains retained records', () => {
    mocks.draft.data = draftView();
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Delete hackathon' }));

    expect(
      screen.getByRole('heading', {
        name: 'Delete “Algiers Builders Weekend”?',
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Linked records and the audit trail will be retained/),
    ).toBeTruthy();
    expect(mocks.deletion.mutate).not.toHaveBeenCalled();
  });

  it('offers the results only for a published hackathon', () => {
    mocks.draft.data = draftView({
      event: { ...draftView().event, status: 'published' },
    });
    renderPage();
    expect(screen.getByRole('heading', { name: 'Results' })).toBeTruthy();
    cleanup();

    mocks.draft.data = draftView();
    renderPage();
    expect(screen.queryByRole('heading', { name: 'Results' })).toBeNull();
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

    expect(screen.getByText('الفرق وشروط المشاركة')).toBeTruthy();
    expect(screen.getByText('فتح التسجيل')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'حفظ' })).toHaveLength(2);
  });

  it('shows a hackathon with the reviewers as in review, instead of the forms', () => {
    mocks.draft.data = draftView({
      isEditable: false,
      review: { status: 'submitted', note: null },
    });
    renderPage();

    expect(screen.getByText('In review')).toBeTruthy();
    expect(screen.getByText(/^Sent for review\./)).toBeTruthy();
    expect(screen.queryByText(/can no longer be changed/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });
});
