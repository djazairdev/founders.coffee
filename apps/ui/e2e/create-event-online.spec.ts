import { expect, test, type Request } from '@playwright/test';

import {
  cleanupRun,
  findEventByTitle,
  type PersistedEvent,
} from './support/d1';
import { signIn } from './support/profile-auth';
import { t } from './support/messages';
import {
  disposableEmail,
  localeFor,
  RUN_ID,
  uniqueTitle,
  watchForApplicationErrors,
} from './support/run';
import {
  MARKET_SLUG,
  continueToLoginButton,
  fillDetails,
  nextButton,
  selectSchedule,
  selectVenue,
  VENUE_QUERY,
  useLocale,
  wizardPath,
} from './support/host-wizard';

const MEETING_URL = 'https://meet.example.org/founders-online';
const MOVED_URL = 'https://meet.example.org/founders-moved';
const createdEventIds: string[] = [];
const createdEmails: string[] = [];

const isMapbox = (request: Request): boolean =>
  /mapbox-gl|api\.mapbox\.com/u.test(request.url());

test.describe('create an online event (B-EVT-10)', () => {
  test.describe.configure({ mode: 'serial' });

  test.afterAll(() => {
    if (createdEventIds.length === 0 && createdEmails.length === 0) return;
    cleanupRun({ eventIds: createdEventIds, emails: createdEmails });
  });

  test('an online meetup asks for its link, loads no map, and publishes with no venue', async ({
    page,
    baseURL,
  }, testInfo) => {
    test.setTimeout(180_000);
    const locale = localeFor(testInfo.project.name);
    const title = uniqueTitle(locale);
    const email = disposableEmail(locale);
    createdEmails.push(email);

    await useLocale(page, locale, baseURL as string);
    const failures = watchForApplicationErrors(page);
    await page.goto(wizardPath());

    const online = page.getByRole('radio', {
      name: t(locale, 'host_format_online'),
    });
    await expect(async () => {
      await page.locator('label', { has: online }).click();
      await expect(page.locator('#host-meeting-url')).toBeVisible({
        timeout: 1_000,
      });
    }).toPass({ timeout: 30_000 });
    await expect(
      page.getByRole('combobox', {
        name: t(locale, 'host_venue_search_label'),
      }),
    ).toHaveCount(0);

    await nextButton(page, locale).click();
    await expect(page.locator('#host-meeting-url')).toBeFocused();
    await page.locator('#host-meeting-url').fill('http://meet.example.org');
    await nextButton(page, locale).click();
    await expect(page.locator('#host-meeting-url')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await page.locator('#host-meeting-url').fill(MEETING_URL);

    const mapRequests: string[] = [];
    page.on('request', (request) => {
      if (isMapbox(request)) mapRequests.push(request.url());
    });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#host-meeting-url')).toHaveValue(MEETING_URL);
    await expect(page.locator('.mapboxgl-canvas')).toHaveCount(0);

    await nextButton(page, locale).click();
    await selectSchedule(page);
    await nextButton(page, locale).click();
    await fillDetails(page, {
      title,
      description: `An online end-to-end event created by the ${locale} regression run ${RUN_ID}.`,
    });
    expect(mapRequests, 'an online draft loads nothing from Mapbox').toEqual(
      [],
    );

    await continueToLoginButton(page, locale).click();
    await signIn(page, locale, email);
    await page.waitForURL(new RegExp(`/${MARKET_SLUG}/e/`), {
      timeout: 60_000,
    });

    await expect
      .poll(() => findEventByTitle(title), { timeout: 30_000 })
      .not.toBeUndefined();
    const persisted = findEventByTitle(title) as PersistedEvent;
    createdEventIds.push(persisted.id);
    expect(persisted).toMatchObject({
      format: 'online',
      meeting_url: MEETING_URL,
      city_code: '556',
      venue: null,
      venue_address: null,
      latitude: null,
      longitude: null,
      status: 'published',
    });

    await page.goto(`/${locale}/edit/${persisted.id}`, {
      waitUntil: 'networkidle',
    });
    const link = page.locator('#edit-meeting-url');
    await expect(link).toHaveValue(MEETING_URL);
    await expect(page.locator('#edit-venue-name')).toHaveCount(0);
    await expect(page.locator('.mapboxgl-canvas')).toHaveCount(0);
    await expect(async () => {
      await link.fill(MOVED_URL);
      await expect(link).toHaveValue(MOVED_URL, { timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
    await page
      .getByRole('button', { name: t(locale, 'host_edit_save'), exact: true })
      .click();
    await expect
      .poll(() => findEventByTitle(title)?.meeting_url, { timeout: 30_000 })
      .toBe(MOVED_URL);
    expect(findEventByTitle(title)?.venue).toBeNull();
    expect(
      failures,
      `unexpected application errors:\n${failures.join('\n')}`,
    ).toHaveLength(0);
  });

  test('a hybrid meetup takes a venue and a link, and edits both', async ({
    page,
    baseURL,
  }, testInfo) => {
    test.setTimeout(180_000);
    const locale = localeFor(testInfo.project.name);
    const title = `${uniqueTitle(locale)} hybrid`;
    const email = disposableEmail(locale);
    createdEmails.push(email);

    await useLocale(page, locale, baseURL as string);
    const failures = watchForApplicationErrors(page);
    await page.goto(wizardPath());

    const hybrid = page.getByRole('radio', {
      name: t(locale, 'host_format_hybrid'),
    });
    await expect(async () => {
      await page.locator('label', { has: hybrid }).click();
      await expect(page.locator('#host-meeting-url')).toBeVisible({
        timeout: 1_000,
      });
    }).toPass({ timeout: 30_000 });
    await page.locator('#host-meeting-url').fill(MEETING_URL);
    const venueName = await selectVenue(page, locale, VENUE_QUERY);
    await nextButton(page, locale).click();
    await selectSchedule(page);
    await nextButton(page, locale).click();
    await fillDetails(page, {
      title,
      description: `A hybrid end-to-end event created by the ${locale} regression run ${RUN_ID}.`,
    });

    await continueToLoginButton(page, locale).click();
    await signIn(page, locale, email);
    await page.waitForURL(new RegExp(`/${MARKET_SLUG}/e/`), {
      timeout: 60_000,
    });

    await expect
      .poll(() => findEventByTitle(title), { timeout: 30_000 })
      .not.toBeUndefined();
    const persisted = findEventByTitle(title) as PersistedEvent;
    createdEventIds.push(persisted.id);
    expect(persisted).toMatchObject({
      format: 'hybrid',
      meeting_url: MEETING_URL,
      venue: venueName,
      status: 'published',
    });
    expect(persisted.latitude).not.toBeNull();

    await page.goto(`/${locale}/edit/${persisted.id}`, {
      waitUntil: 'networkidle',
    });
    await expect(page.locator('#edit-meeting-url')).toHaveValue(MEETING_URL);
    await expect(page.locator('#edit-venue-name')).toHaveValue(venueName);
    expect(
      failures,
      `unexpected application errors:\n${failures.join('\n')}`,
    ).toHaveLength(0);
  });
});
