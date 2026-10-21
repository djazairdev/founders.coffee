import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  open_to_co_founding,
  open_to_jobs,
  profile_open_to_label,
  profile_skills_label,
  profile_view_link,
  skill_ai_ml,
  skill_backend,
  type Locale,
} from '@founders-coffee/i18n';

import type { PublicProfile } from '../api';
import { PublicProfileHeader } from './PublicProfileHeader';
import { PublicProfilePortfolio } from './PublicProfilePortfolio';

const member: PublicProfile = {
  userId: 'usr_member',
  displayName: 'Amina',
  photoAssetId: null,
  memberSince: '2025-11',
  headline: null,
  stage: null,
  introduction: null,
  interests: [],
  spokenLanguages: [],
  skills: [],
  links: [],
  openTo: [],
  hostedCount: 0,
  attendedCount: null,
};

const published: PublicProfile = {
  ...member,
  skills: ['backend', 'ai_ml'],
  openTo: ['jobs', 'co_founding'],
  links: [
    { kind: 'github', url: 'https://github.com/amina' },
    { kind: 'linkedin', url: 'https://www.linkedin.com/in/amina' },
    { kind: 'website', url: 'https://amina.dev' },
  ],
};

afterEach(cleanup);

const termed = (term: string) => {
  const dt = screen.getByText(term, { selector: 'dt' });
  const dd = dt.nextElementSibling;
  if (!(dd instanceof HTMLElement)) throw new Error(`nothing under ${term}`);
  return within(dd)
    .getAllByRole('listitem')
    .map((item) => item.textContent);
};

describe('skills, links and open to on the public profile (B-PRF-03)', () => {
  it.each<Locale>(['ar', 'fr', 'en'])(
    'names the published skills and open to under their labels, in %s',
    (locale) => {
      render(<PublicProfilePortfolio locale={locale} profile={published} />);

      expect(termed(profile_skills_label({}, { locale }))).toEqual([
        skill_backend({}, { locale }),
        skill_ai_ml({}, { locale }),
      ]);
      expect(termed(profile_open_to_label({}, { locale }))).toEqual([
        open_to_jobs({}, { locale }),
        open_to_co_founding({}, { locale }),
      ]);
    },
  );

  it('says nothing about a field that was not published', () => {
    const { container } = render(
      <PublicProfilePortfolio locale="en" profile={member} />,
    );
    expect(container.innerHTML).toBe('');

    render(
      <PublicProfilePortfolio
        locale="en"
        profile={{ ...member, openTo: ['jobs'] }}
      />,
    );
    expect(screen.queryByText('Skills')).toBeNull();
    expect(termed('Open to')).toEqual(['Jobs']);
  });

  it.each<Locale>(['ar', 'fr', 'en'])(
    'links each published address by its kind, opened without passing anything on, in %s',
    (locale) => {
      render(<PublicProfileHeader locale={locale} profile={published} />);

      const links = screen.getAllByRole('link');
      expect(links.map((link) => link.textContent)).toEqual([
        'GitHub',
        'LinkedIn',
        profile_view_link({}, { locale }),
      ]);
      expect(links.map((link) => link.getAttribute('href'))).toEqual(
        published.links.map((link) => link.url),
      );
      for (const link of links) {
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')?.split(' ')).toEqual(
          expect.arrayContaining(['noopener', 'nofollow', 'ugc']),
        );
        expect(link.getAttribute('aria-label')).toBe(
          `${link.textContent}: ${link.getAttribute('href')}`,
        );
      }
    },
  );

  it('shows no links when none were published', () => {
    render(<PublicProfileHeader locale="en" profile={member} />);
    expect(screen.queryAllByRole('link')).toEqual([]);
  });
});
