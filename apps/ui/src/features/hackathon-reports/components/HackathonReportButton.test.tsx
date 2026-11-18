import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';

import { HackathonReportButton } from './HackathonReportButton';

const report = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  error: null as unknown,
  mutate: vi.fn(),
}));

vi.mock('../hooks', () => ({ useReportHackathonTarget: () => report }));

const open = async () => {
  render(
    <HackathonReportButton
      eventId="evt_1"
      targetType="submission"
      targetId="sub_1"
      name="Ledger"
      locale="en"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Report Ledger' }));
  await screen.findByRole('radio', { name: 'Plagiarism', hidden: true });
};

const send = () =>
  screen.getByRole('button', { name: 'Send the report', hidden: true });

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
});

afterEach(() => {
  cleanup();
  report.isError = false;
  report.error = null;
  report.mutate.mockReset();
});

describe('HackathonReportButton (B-SAFE-01)', () => {
  it('asks for a reason before it sends', async () => {
    await open();

    expect(send()).toHaveProperty('disabled', true);
    fireEvent.click(
      screen.getByRole('radio', { name: 'Plagiarism', hidden: true }),
    );
    fireEvent.click(send());

    expect(report.mutate).toHaveBeenCalledWith(
      {
        eventId: 'evt_1',
        targetType: 'submission',
        targetId: 'sub_1',
        reason: 'plagiarism',
      },
      expect.anything(),
    );
  });

  it('thanks the member once the report is in, in place of the button', async () => {
    report.mutate.mockImplementation((_, handlers) => handlers.onSuccess());
    await open();
    fireEvent.click(
      screen.getByRole('radio', { name: 'Plagiarism', hidden: true }),
    );
    fireEvent.click(send());

    expect(screen.getByRole('status').textContent).toBe(
      'Thank you. We will look at this.',
    );
    expect(screen.queryByRole('button', { name: 'Report Ledger' })).toBeNull();
  });

  it('says so when the member reported it before', async () => {
    report.mutate.mockImplementation((_, handlers) =>
      handlers.onError(new AppError('already_reported', 'Already')),
    );
    await open();
    fireEvent.click(
      screen.getByRole('radio', { name: 'Plagiarism', hidden: true }),
    );
    fireEvent.click(send());

    expect(screen.getByRole('status').textContent).toBe(
      'You have already reported this.',
    );
  });

  it('says why the report of a member’s own team was refused', async () => {
    report.isError = true;
    report.error = new AppError('own_team_report', 'Own team');
    await open();

    expect(screen.getByText('You cannot report your own team.')).toBeTruthy();
  });
});
