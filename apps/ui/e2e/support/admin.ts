import { readFileSync } from 'node:fs';

import { expect, type Page } from '@playwright/test';

import { cleanupRun, d1 } from './d1';
import { latestSignInOtp } from './otp';
import { newId } from './run';

export const ADMIN_URL = process.env.E2E_ADMIN_URL ?? 'http://localhost:3002';

/**
 * The address the local admin app takes as its Access identity. The app refuses a session whose
 * email differs from it, so the operator a run signs in as has to be this one.
 */
const accessEmail = (): string => {
  const vars = readFileSync(
    new URL('../../../admin/.dev.vars', import.meta.url),
    'utf8',
  );
  const email = /^CF_ACCESS_DEV_EMAIL=["']?([^"'\s]+)/mu.exec(vars)?.[1];
  if (!email)
    throw new Error('apps/admin/.dev.vars must set CF_ACCESS_DEV_EMAIL');
  return email;
};

/**
 * Make the local Access identity an administrator for a run, creating the account if it has none,
 * and return its address with how to put things back as they were.
 */
export const useOperator = (): {
  readonly email: string;
  readonly restore: () => void;
} => {
  const email = accessEmail();
  const [existing] = d1<{ role: string }>(
    `SELECT role FROM user WHERE email = '${email}'`,
  );
  if (existing) d1(`UPDATE user SET role = 'admin' WHERE email = '${email}'`);
  else
    d1(
      `INSERT INTO user (id, name, email, role) VALUES ('${newId('usr')}', 'E2E operator', '${email}', 'admin')`,
    );
  return {
    email,
    restore: () => {
      if (existing)
        d1(
          `UPDATE user SET role = '${existing.role}' WHERE email = '${email}'`,
        );
      else cleanupRun({ eventIds: [], emails: [email] });
    },
  };
};

/**
 * Sign the operator in through the admin app's own form. Its code goes to the log the sign-in codes
 * are read from, since Playwright sends both apps' output there.
 *
 * The address is typed again until the button takes it: a value filled before React hydrates the
 * form sets the field but never reaches the component.
 */
export const signInToAdmin = async (
  page: Page,
  email: string,
  path: string,
): Promise<void> => {
  await page.goto(`${ADMIN_URL}/login`);
  const send = page.locator('button[type="submit"]');
  await expect(async () => {
    await page.locator('#admin-email').fill('');
    await page.locator('#admin-email').fill(email);
    await expect(send).toBeEnabled({ timeout: 1_000 });
  }).toPass({ timeout: 60_000 });
  const before = latestSignInOtp(email);
  await send.click();
  await expect(page.locator('#admin-code')).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(() => latestSignInOtp(email), { timeout: 30_000, intervals: [500] })
    .not.toBe(before);
  await page.locator('#admin-code').fill(latestSignInOtp(email) ?? '');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#admin-code')).toBeHidden({ timeout: 30_000 });
  await page.goto(`${ADMIN_URL}${path}`);
};
