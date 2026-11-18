import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  open_to_co_founding,
  profile_link_github_invalid,
  profile_links_label,
  profile_open_to_label,
  profile_publish_public,
  profile_save,
  profile_skills_label,
  skill_backend,
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

const group = (name: string) => screen.getByRole('group', { name });

const publishSwitch = (field: string, locale: Locale = 'en') =>
  screen.getByRole('checkbox', {
    name: `${profile_publish_public({}, { locale })}: ${field}`,
  });

const save = (locale: Locale = 'en') =>
  fireEvent.click(
    screen.getByRole('button', { name: profile_save({}, { locale }) }),
  );

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('skills, links and open to in the profile form (B-PRF-02)', () => {
  it.each<Locale>(['ar', 'fr', 'en'])(
    'offers each field with its own publish switch, in %s',
    (locale) => {
      show(locale);

      for (const field of [
        profile_skills_label({}, { locale }),
        profile_links_label({}, { locale }),
        profile_open_to_label({}, { locale }),
      ]) {
        expect(group(field)).toBeTruthy();
        expect(
          (publishSwitch(field, locale) as HTMLInputElement).disabled,
          'a field with nothing in it has nothing to publish',
        ).toBe(true);
      }
      expect(
        screen.getByRole('button', { name: skill_backend({}, { locale }) }),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', {
          name: open_to_co_founding({}, { locale }),
        }),
      ).toBeTruthy();
      for (const kind of ['github', 'linkedin', 'website'])
        expect(
          document.querySelector(`#profile-link-${kind}`)?.getAttribute('dir'),
        ).toBe('ltr');
    },
  );

  it('stops at ten skills', () => {
    show();
    const skills = group('Skills');
    const chips = Array.from(skills.querySelectorAll('button'));

    for (const chip of chips) fireEvent.click(chip);

    expect(
      chips.filter((chip) => chip.getAttribute('aria-pressed') === 'true'),
    ).toHaveLength(10);
  });

  it('saves skills, links and open to with what the member chose to publish', async () => {
    state.save.mockResolvedValue(saved);
    show();

    fireEvent.click(
      screen.getByRole('button', { name: 'Back-end development' }),
    );
    fireEvent.click(publishSwitch('Skills'));
    fireEvent.change(screen.getByLabelText('GitHub'), {
      target: { value: 'https://github.com/amina' },
    });
    fireEvent.change(screen.getByLabelText('Your personal website'), {
      target: { value: 'https://amina.dev' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Co-founding' }));
    fireEvent.click(publishSwitch('Open to'));
    save();

    await vi.waitFor(() => expect(state.save).toHaveBeenCalledOnce());
    expect(state.save.mock.calls[0]?.[0].profile).toMatchObject({
      skills: ['backend'],
      links: [
        { kind: 'github', url: 'https://github.com/amina' },
        { kind: 'website', url: 'https://amina.dev' },
      ],
      openTo: ['co_founding'],
      visibility: { skills: true, links: false, openTo: true },
    });
  });

  it.each<Locale>(['ar', 'fr', 'en'])(
    'refuses an address under the wrong kind beside its field and saves nothing, in %s',
    (locale) => {
      show(locale);
      const github = document.querySelector<HTMLInputElement>(
        '#profile-link-github',
      );
      if (!github) throw new Error('no GitHub field');

      fireEvent.change(github, {
        target: { value: 'https://www.linkedin.com/in/amina' },
      });
      save(locale);

      const message = profile_link_github_invalid({}, { locale });
      expect(
        document.querySelector('#profile-link-github-error')?.textContent,
      ).toBe(message);
      expect(github.getAttribute('aria-invalid')).toBe('true');
      expect(github.getAttribute('aria-describedby')).toBe(
        'profile-link-github-error',
      );
      expect(document.activeElement).toBe(github);
      expect(state.save).not.toHaveBeenCalled();

      fireEvent.change(github, {
        target: { value: 'https://github.com/amina' },
      });
      expect(document.querySelector('#profile-link-github-error')).toBeNull();
      expect(github.hasAttribute('aria-invalid')).toBe(false);
    },
  );
});
