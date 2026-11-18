import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { draftView, savedDetails } from '../hackathon-details-form.fixtures';
import {
  fill,
  getManagePageMocks,
  renderManagePage as renderPage,
  resetManagePage,
} from './HackathonManagePage.fixtures';

const mocks = getManagePageMocks();

const clickManageSection = (index: number) => {
  const summary = document.querySelectorAll('summary').item(index);
  if (summary) fireEvent.click(summary);
};

const saveButton = (index = 0) => {
  const button = screen.getAllByRole('button', { name: 'Save' }).at(index);
  if (!button) throw new Error('The section save button is missing');
  return button;
};

afterEach(resetManagePage);

describe('HackathonManagePage: the details form (B-HKN-12)', () => {
  it('saves deadlines and settings as separate requests', () => {
    mocks.draft.data = draftView({ details: savedDetails });
    renderPage();

    expect(screen.queryByText(/^Draft\./u)).toBeNull();
    expect(screen.getByText(/March 12, 2099/u)).toBeTruthy();
    fireEvent.change(
      document.getElementById(
        'hackathon-registrationOpensAt-time',
      ) as HTMLInputElement,
      { target: { value: '10:00' } },
    );
    fireEvent.click(saveButton());

    expect(mocks.saveDeadlines.mutate).toHaveBeenCalledWith(
      {
        eventId: 'evt_draft',
        version: 1,
        deadlines: {
          registrationOpensAt: Date.UTC(2099, 1, 1, 9, 0),
          registrationClosesAt: Date.UTC(2099, 2, 10, 21, 0),
          submissionDeadlineAt: Date.UTC(2099, 2, 14, 12, 0),
          judgingEndsAt: Date.UTC(2099, 2, 21, 17, 0),
        },
      },
      expect.anything(),
    );
    clickManageSection(1);
    fill('Maximum team members', '6');
    fill(/^Maximum participants/u, '120');
    fireEvent.click(
      screen.getByRole('radio', { name: /Allowed with conditions/ }),
    );
    fill('Conditions for using AI tools', 'Name tools used at submission.');
    fill(/^Licence and ownership/, 'Teams keep what they build.');
    fireEvent.click(saveButton(1));

    expect(mocks.saveSettings.mutate).toHaveBeenCalledWith(
      {
        eventId: 'evt_draft',
        version: 1,
        settings: {
          attendanceModes: ['online'],
          teamMin: 2,
          teamMax: 6,
          capacity: 120,
          minimumAge: 18,
          rules: 'Build something new during the weekend.',
          aiPolicy: 'conditional',
          aiPolicyNote: 'Name tools used at submission.',
          licenceNote: 'Teams keep what they build.',
        },
      },
      expect.anything(),
    );
  });

  it('derives deadline defaults and validates settings before save', () => {
    mocks.draft.data = draftView();
    renderPage();

    fireEvent.click(saveButton());
    expect(mocks.saveDeadlines.mutate).toHaveBeenCalledWith(
      {
        eventId: 'evt_draft',
        version: 1,
        deadlines: {
          registrationOpensAt: Date.UTC(2099, 2, 5, 8, 0),
          registrationClosesAt: Date.UTC(2099, 2, 12, 7, 0),
          submissionDeadlineAt: Date.UTC(2099, 2, 14, 17, 0),
          judgingEndsAt: Date.UTC(2099, 2, 21, 17, 0),
        },
      },
      expect.anything(),
    );
    clickManageSection(1);
    fireEvent.click(saveButton(1));

    expect(mocks.saveSettings.mutate).not.toHaveBeenCalled();
    expect(
      screen.getByText('Choose an AI policy.', { selector: 'p' }),
    ).toBeTruthy();
  });

  it.each([
    ['draft', 'draft'],
    ['draft', 'submitted'],
    ['draft', 'rejected'],
    ['published', 'approved'],
  ] as const)(
    'does not repeat the creation notice for a configured %s event with %s review',
    (status, reviewStatus) => {
      mocks.draft.data = draftView(
        {
          details: savedDetails,
          isEditable: reviewStatus !== 'submitted',
          review: { status: reviewStatus, note: null },
        },
        { status },
      );
      renderPage();

      expect(screen.queryByText(/^Draft saved\./u)).toBeNull();
    },
  );

  it('opens on saved settings without a persistent save message and reports errors in a toast', () => {
    mocks.draft.data = draftView({ details: savedDetails });
    mocks.saveDeadlines.isSuccess = true;
    mocks.saveSettings.isSuccess = true;
    renderPage();
    clickManageSection(1);

    expect(
      (screen.getByLabelText('Maximum team members') as HTMLInputElement).value,
    ).toBe('5');
    expect(
      (
        screen.getByRole('radio', {
          name: /Allowed with disclosure/,
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(screen.queryByText('Details saved.')).toBeNull();
    fireEvent.click(saveButton(1));
    expect(mocks.saveSettings.mutate).toHaveBeenCalled();
    act(() =>
      mocks.saveSettings.mutate.mock.lastCall?.[1]?.onError?.({
        code: 'rate_limited',
      }),
    );
    expect(
      screen.getByText(
        'You have saved several changes recently. Wait a few minutes, then try again.',
      ),
    ).toBeTruthy();
  });

  it('locks saved participation rules when registration is open', () => {
    mocks.draft.data = draftView(
      { stage: 'locked', version: 4, details: savedDetails },
      { status: 'published' },
    );
    vi.setSystemTime(Date.UTC(2099, 1, 10));
    renderPage();
    clickManageSection(1);
    vi.useRealTimers();

    expect(
      screen.getByText(
        'Registration is open, so the rules people signed up under stay as they are. Places can grow, and dates still ahead can only move later.',
      ),
    ).toBeTruthy();
    expect(
      (
        document.getElementById(
          'hackathon-registrationOpensAt-date',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        document.getElementById(
          'hackathon-registrationClosesAt-date',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(
      (screen.getByLabelText('Maximum team members') as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByLabelText(/^Maximum participants/) as HTMLInputElement)
        .disabled,
    ).toBe(false);
    expect(
      (document.getElementById('hackathon-rules') as HTMLTextAreaElement)
        .disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole('radio', {
          name: /Allowed with conditions/,
        }) as HTMLInputElement
      ).disabled,
    ).toBe(true);

    fill(/^Maximum participants/, '200');
    fireEvent.click(saveButton(1));
    expect(mocks.saveSettings.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ version: 4 }),
      expect.anything(),
    );
  });

  it('reports a version conflict through the section toast', () => {
    mocks.draft.data = draftView({ details: savedDetails });
    renderPage();
    clickManageSection(1);
    fireEvent.click(saveButton(1));
    act(() =>
      mocks.saveSettings.mutate.mock.lastCall?.[1]?.onError?.({
        code: 'hackathon_conflict',
      }),
    );

    expect(
      screen.getByText(
        'This hackathon changed since you opened it. Reload the page to see the latest, then save again.',
      ),
    ).toBeTruthy();
  });

  it('keeps legacy hybrid attendance derived without showing attendance controls', () => {
    mocks.draft.data = draftView(
      { details: savedDetails },
      { format: 'hybrid' },
    );
    renderPage();
    clickManageSection(1);

    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(
      screen.getByRole('radio', { name: /Allowed with disclosure/ }),
    );
    fireEvent.click(saveButton(1));

    expect(mocks.saveSettings.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          attendanceModes: ['online'],
        }),
      }),
      expect.anything(),
    );
  });
});
