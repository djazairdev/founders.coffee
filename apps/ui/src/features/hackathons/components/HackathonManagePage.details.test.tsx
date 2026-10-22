import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { draftView, savedDetails } from '../hackathon-details-form.fixtures';
import {
  fill,
  getManagePageMocks,
  renderManagePage as renderPage,
  resetManagePage,
} from './HackathonManagePage.fixtures';

const mocks = getManagePageMocks();

afterEach(resetManagePage);

describe('HackathonManagePage: the details form (B-HKN-12)', () => {
  it('saves the second step from a complete form', () => {
    mocks.draft.data = draftView();
    renderPage('en', true);

    expect(
      screen.getByText('Draft saved. Now set the rules and who can take part.'),
    ).toBeTruthy();
    expect(screen.getByText(/Kickoff is March 12, 2099/)).toBeTruthy();
    fill('Registration opens', '2099-02-01T09:00');
    fill('Registration closes', '2099-03-10T22:00');
    fill('Submissions close', '2099-03-14T13:00');
    fill('Judging ends', '2099-03-21T18:00');
    fill('Largest team', '5');
    fill(/^Places/, '120');
    fireEvent.click(screen.getByRole('radio', { name: /AI-native/ }));
    fill(/^Licence and ownership/, 'Teams keep what they build.');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.save.mutate).toHaveBeenCalledWith({
      eventId: 'evt_draft',
      version: 1,
      details: {
        registrationOpensAt: Date.UTC(2099, 1, 1, 8, 0),
        registrationClosesAt: Date.UTC(2099, 2, 10, 21, 0),
        submissionDeadlineAt: Date.UTC(2099, 2, 14, 12, 0),
        judgingEndsAt: Date.UTC(2099, 2, 21, 17, 0),
        attendanceModes: ['online'],
        teamMin: 1,
        teamMax: 5,
        capacity: 120,
        aiPolicy: 'ai_native',
        licenceNote: 'Teams keep what they build.',
      },
    });
  });

  it('takes the organiser to the first field still to fill, and sends nothing', () => {
    mocks.draft.data = draftView();
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.save.mutate).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toBe('hackathon-registrationOpensAt');
    expect(screen.getByText('Choose when registration opens.')).toBeTruthy();
    expect(screen.getByText('Choose an AI policy.')).toBeTruthy();
  });

  it('opens on the saved details, and says when they were saved or refused', () => {
    mocks.draft.data = draftView({ details: savedDetails });
    mocks.save.isSuccess = true;
    renderPage();

    expect(
      (screen.getByLabelText('Largest team') as HTMLInputElement).value,
    ).toBe('5');
    expect(
      (
        screen.getByRole('radio', {
          name: /Allowed with disclosure/,
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(screen.getByText('Details saved.')).toBeTruthy();
    cleanup();

    mocks.save.isSuccess = false;
    mocks.save.isError = true;
    mocks.save.error = { code: 'rate_limited' };
    renderPage();
    expect(
      screen.getByText(
        'You have saved several changes recently. Wait a few minutes, then try again.',
      ),
    ).toBeTruthy();
  });

  it('locks what registrants signed up under once registration is open', () => {
    mocks.draft.data = draftView(
      { stage: 'locked', version: 4, details: savedDetails },
      { status: 'published' },
    );
    vi.setSystemTime(Date.UTC(2099, 1, 10));
    renderPage();
    vi.useRealTimers();

    expect(
      screen.getByText(
        'Registration is open, so the rules people signed up under stay as they are. Places can grow, and dates still ahead can only move later.',
      ),
    ).toBeTruthy();
    const isDisabled = (label: string | RegExp) =>
      (screen.getByLabelText(label) as HTMLInputElement).disabled;
    expect(isDisabled('Registration opens')).toBe(true);
    expect(isDisabled('Registration closes')).toBe(false);
    expect(isDisabled('Largest team')).toBe(true);
    expect(isDisabled(/^Places/)).toBe(false);
    expect(
      (document.getElementById('hackathon-rules') as HTMLTextAreaElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('radio', { name: /AI-native/ }) as HTMLInputElement)
        .disabled,
    ).toBe(true);

    fill(/^Places/, '200');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mocks.save.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ version: 4 }),
    );
  });

  it('asks for a reload when the hackathon changed since the page opened', () => {
    mocks.draft.data = draftView({ details: savedDetails });
    mocks.save.isError = true;
    mocks.save.error = { code: 'hackathon_conflict' };
    renderPage();

    expect(
      screen.getByText(
        'This hackathon changed since you opened it. Reload the page to see the latest, then save again.',
      ),
    ).toBeTruthy();
  });

  it('offers both ways to take part only for a hybrid hackathon', () => {
    mocks.draft.data = draftView({}, { format: 'hybrid' });
    renderPage();

    expect(screen.getByRole('checkbox', { name: 'In person' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Online' })).toBeTruthy();
  });
});
