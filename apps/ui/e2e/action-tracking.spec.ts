import { expect, test } from '@playwright/test';
import type { Action } from '@founders-coffee/core';

const campaign =
  '?utm_source=facebook&utm_medium=paid_social&utm_campaign=activation-check';

test('counts resolved SPA navigation and keeps campaign codes on internal links', async ({
  page,
}) => {
  const reports: Action[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/actions')
      reports.push(request.postDataJSON() as Action);
  });
  const landingReport = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/actions' &&
      response.request().postDataJSON().event === 'landing_view',
  );
  await page.goto(`/en/algeria${campaign}`);
  expect((await landingReport).status()).toBe(204);
  expect(
    reports.filter((report) => report.event === 'landing_view'),
  ).toHaveLength(1);
  const host = page
    .getByRole('link', { name: 'Host a meetup', exact: true })
    .first();
  await expect(host).toHaveAttribute('href', /utm_campaign=activation-check/);
  const hostReport = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/actions' &&
      response.request().postDataJSON().event === 'host_start',
  );
  await host.click();
  expect((await hostReport).status()).toBe(204);
  await expect(page).toHaveURL(
    /\/en\/algeria\/host\/create\?.*utm_campaign=activation-check/,
  );
  expect(reports.map((report) => report.event)).toEqual([
    'landing_view',
    'host_start',
  ]);
  expect(
    reports.every(
      (report) =>
        report.attribution.source === 'facebook' &&
        report.attribution.campaign === 'activation-check',
    ),
  ).toBe(true);
});

test('preserves a campaign on a server-rendered sign-in return path', async ({
  page,
}) => {
  await page.goto(`/en/profile${campaign}`);
  await expect(page).toHaveURL(/\/en\/login\?/);
  const url = new URL(page.url());
  const returned = new URL(url.searchParams.get('redirect') ?? '/', url.origin);
  expect(returned.pathname).toBe('/en/profile');
  expect(returned.searchParams.get('utm_campaign')).toBe('activation-check');
});

test('sends no action reports when Global Privacy Control is enabled', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true }),
  );
  const reports: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/actions')
      reports.push(request.url());
  });
  await page.goto(`/en/algeria${campaign}`);
  const host = page
    .getByRole('link', { name: 'Host a meetup', exact: true })
    .first();
  await expect(host).toBeVisible();
  await host.click();
  await expect(page).toHaveURL(/\/host\/create/);
  expect(reports).toEqual([]);
});
