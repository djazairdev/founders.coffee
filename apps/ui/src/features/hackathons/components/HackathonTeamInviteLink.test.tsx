import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EVENT_ID, mutation } from '../team-page.fixtures';
import { HackathonTeamInviteLink } from './HackathonTeamInviteLink';

const mocks = vi.hoisted(() => ({
  changes: {} as Record<
    string,
    ReturnType<typeof import('../team-page.fixtures').mutation>
  >,
}));

const change = (name: string) => {
  mocks.changes[name] ??= mutation();
  return mocks.changes[name];
};

vi.mock('../team-hooks', () => ({
  useCreateTeamInvite: () => change('invite'),
  useRevokeTeamInvite: () => change('revoke'),
}));

afterEach(() => {
  cleanup();
  mocks.changes = {};
});

const TOKEN = 'b'.repeat(43);

const renderLink = (
  expiresAt: number | null = null,
  locale: 'en' | 'ar' = 'en',
) =>
  render(
    <HackathonTeamInviteLink
      eventId={EVENT_ID}
      expiresAt={expiresAt}
      locale={locale}
      timeZone="Africa/Algiers"
    />,
  );

const madeWith = (token: string) => {
  const [, options] = change('invite').mutate.mock.calls.at(-1) as [
    unknown,
    { onSuccess: (created: { token: string }) => void },
  ];
  act(() => options.onSuccess({ token }));
};

describe('HackathonTeamInviteLink (B-TEAM-07)', () => {
  it('makes a link to the team page and copies it', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    renderLink();

    fireEvent.click(screen.getByRole('button', { name: 'Get an invite link' }));
    madeWith(TOKEN);

    const field = screen.getByRole('textbox', {
      name: 'Invite link',
    }) as HTMLInputElement;
    expect(field.value).toBe(
      `${window.location.origin}/en/hackathon/${EVENT_ID}/team?join=${TOKEN}`,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });
    expect(writeText).toHaveBeenCalledWith(field.value);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
  });

  it('says until when a link made earlier works, and turns it off', () => {
    renderLink(Date.parse('2099-03-08T10:00:00Z'));

    expect(
      screen.getByText(/^Your link works until Sun, Mar 8, 11:00\./u),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Turn the link off' }));
    expect(change('revoke').mutate).toHaveBeenCalled();
  });

  it('offers no turning off when the team has no link', () => {
    renderLink();

    expect(
      screen.queryByRole('button', { name: 'Turn the link off' }),
    ).toBeNull();
  });

  it('reads in Arabic, keeping the address left to right', () => {
    renderLink(null, 'ar');
    fireEvent.click(
      screen.getByRole('button', { name: 'الحصول على رابط دعوة' }),
    );
    madeWith(TOKEN);

    expect(
      screen.getByRole('textbox', { name: 'رابط الدعوة' }).getAttribute('dir'),
    ).toBe('ltr');
  });
});
