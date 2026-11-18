import { expect, type Page } from '@playwright/test';

import { t, type E2eLocale } from './messages';
import { signIn } from './profile-auth';

export const MENTOR_HELP = 'Product feedback';
const MENTOR_HOURS = '15:00 to 16:00';

export const inviteRole = async (
  page: Page,
  locale: E2eLocale,
  role: 'judge' | 'mentor',
) => {
  const region = page.locator(
    `section[aria-labelledby="hackathon-${role}-roster-heading"]`,
  );
  const field = region.getByLabel(t(locale, 'hackathon_team_invite_label'));
  const previous = (await field.count()) ? await field.inputValue() : '';
  await region
    .getByRole('button', {
      name: t(
        locale,
        role === 'judge'
          ? 'hackathon_role_invite_judge'
          : 'hackathon_role_invite_mentor',
      ),
    })
    .click();
  await expect(field).toBeVisible({ timeout: 30_000 });
  await expect(field).not.toHaveValue(previous, { timeout: 30_000 });
  return field.inputValue();
};

export const acceptRole = async (
  page: Page,
  locale: E2eLocale,
  email: string,
  link: string,
  isMentor = false,
) => {
  await page.goto(link);
  await page.waitForURL((url) => url.pathname === `/${locale}/login`);
  await signIn(page, locale, email, 'login_email_continue');
  await expect(
    page.getByRole('heading', {
      name: t(locale, 'hackathon_role_invitation_title'),
    }),
  ).toBeVisible();
  if (isMentor) {
    await page
      .getByLabel(t(locale, 'hackathon_mentor_helps_with'))
      .fill(MENTOR_HELP);
    await page
      .getByLabel(t(locale, 'hackathon_mentor_office_hours'))
      .fill(MENTOR_HOURS);
  }
  await page
    .getByRole('button', {
      name: t(locale, 'org_invitation_accept'),
      exact: true,
    })
    .click();
  await expect(
    page.getByText(t(locale, 'hackathon_role_accepted')),
  ).toBeVisible({ timeout: 30_000 });
  await page.waitForURL(
    (url) => url.pathname === new URL(link).pathname && url.search === '',
  );
};
