import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  discard_changes,
  profile_save,
  profile_search_hint,
  profile_search_toggle,
  type Locale,
} from '@founders-coffee/i18n';

import type { UserProfile } from '../api';
import { savedProfile as saved } from '../profile.fixtures';
import { ProfileForm } from './ProfileForm';

const state = vi.hoisted(() => ({ save: vi.fn(), refetch: vi.fn() }));

vi.mock('../hooks', () => ({
  useUpdateProfile: () => ({
    mutateAsync: state.save,
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
  }),
  usePhotoUploadAvailability: () => ({ data: { enabled: false } }),
  usePhotoUpload: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemovePhoto: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const show = (locale: Locale = 'en', profile: UserProfile = saved) =>
  render(
    <ProfileForm profile={profile} locale={locale} onReload={state.refetch} />,
  );

const searchSwitch = (locale: Locale = 'en') =>
  screen.getByRole<HTMLInputElement>('checkbox', {
    name: profile_search_toggle({}, { locale }),
  });

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('the search-engine switch in the profile form (B-PRF-04)', () => {
  it.each<Locale>(['ar', 'fr', 'en'])(
    'is off for a member who never turned it on, and says what it does, in %s',
    (locale) => {
      show(locale);

      const toggle = searchSwitch(locale);
      expect(toggle.checked).toBe(false);
      expect(toggle.disabled).toBe(false);
      expect(
        document.getElementById(toggle.getAttribute('aria-describedby') ?? '')
          ?.textContent,
      ).toBe(profile_search_hint({}, { locale }));
    },
  );

  it('saves the choice in both directions', async () => {
    state.save.mockResolvedValue({ ...saved, indexable: true });
    show();

    fireEvent.click(searchSwitch());
    fireEvent.click(
      screen.getByRole('button', { name: profile_save({}, { locale: 'en' }) }),
    );
    await vi.waitFor(() => expect(state.save).toHaveBeenCalledOnce());
    expect(state.save.mock.calls[0]?.[0].profile).toMatchObject({
      indexable: true,
    });

    cleanup();
    state.save.mockReset();
    state.save.mockResolvedValue(saved);
    show('en', { ...saved, indexable: true });

    expect(searchSwitch().checked).toBe(true);
    fireEvent.click(searchSwitch());
    fireEvent.click(
      screen.getByRole('button', { name: profile_save({}, { locale: 'en' }) }),
    );
    await vi.waitFor(() => expect(state.save).toHaveBeenCalledOnce());
    expect(state.save.mock.calls[0]?.[0].profile).toMatchObject({
      indexable: false,
    });
  });

  it('counts as a change to save, and Discard puts it back', () => {
    show();

    expect(
      screen.queryByRole('button', {
        name: discard_changes({}, { locale: 'en' }),
      }),
    ).toBeNull();
    fireEvent.click(searchSwitch());
    fireEvent.click(
      screen.getByRole('button', {
        name: discard_changes({}, { locale: 'en' }),
      }),
    );

    expect(searchSwitch().checked).toBe(false);
  });
});
