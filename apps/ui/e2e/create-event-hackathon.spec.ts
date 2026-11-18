import { expect, test, type Page } from '@playwright/test';

import { ADMIN_URL, signInToAdmin, useOperator } from './support/admin';
import { cleanupRun, d1 } from './support/d1';
import { cleanupHackathon, turnOnHackathons } from './support/hackathons';
import {
  fillDetails,
  nextButton,
  selectSchedule,
  useLocale,
} from './support/host-wizard';
import { t, type E2eLocale } from './support/messages';
import { signInBackTo } from './support/profile-auth';
import {
  localeFor,
  RUN_ID,
  uniqueTitle,
  watchForApplicationErrors,
} from './support/run';

const MEETING_URL = 'https://meet.example.org/founders-hackathon';
const HOUR_SECONDS = 3_600;
const DAY_SECONDS = 86_400;
const ALGIERS_OFFSET_SECONDS = HOUR_SECONDS;

/**
 * The wizard opens in person, so the map starts loading before the run picks online, and what
 * Mapbox answers a development token says nothing about the organiser flow.
 */
const isMapResponse = (failure: string): boolean => {
  try {
    return new URL(failure).origin === 'https://api.mapbox.com';
  } catch {
    return false;
  }
};

const organiserFor = (locale: E2eLocale) => ({
  organisationId: `org_e2e_hkn_${locale}_${RUN_ID}`,
  userId: `usr_e2e_hkn_${locale}_${RUN_ID}`,
  memberId: `mem_e2e_hkn_${locale}_${RUN_ID}`,
  slug: `e2e-hkn-${locale}-${RUN_ID}`,
  email: `e2e-hkn-organiser-${locale}-${RUN_ID}@e2e.invalid`,
});

type Organiser = ReturnType<typeof organiserFor>;

/** An approved organisation in Algiers, with the member who will organise its hackathon. */
const seedOrganisation = (organiser: Organiser): void => {
  d1(
    `INSERT INTO user (id, name, email) VALUES ('${organiser.userId}', 'Organiser ${RUN_ID}', '${organiser.email}'); ` +
      `INSERT INTO organization (id, name, slug, kind, status, market_code, city_code, description) VALUES ('${organiser.organisationId}', 'E2E organisation ${RUN_ID}', '${organiser.slug}', 'community', 'approved', 'DZ', '556', 'Seeded to organise a hackathon.'); ` +
      `INSERT INTO member (id, organization_id, user_id, role) VALUES ('${organiser.memberId}', '${organiser.organisationId}', '${organiser.userId}', 'owner');`,
  );
};

/** A moment as the `datetime-local` fields read it, in Algiers, whose clock never changes. */
const algiersInput = (seconds: number): string =>
  new Date((seconds + ALGIERS_OFFSET_SECONDS) * 1000)
    .toISOString()
    .slice(0, 16);

type Saved = {
  readonly starts_at: number;
  readonly ends_at: number;
  readonly slug: string;
  readonly status: string;
  readonly review_status: string;
};

const savedHackathon = (eventId: string): Saved | undefined =>
  d1<Saved>(
    `SELECT e.starts_at, e.ends_at, e.slug, e.status, h.review_status FROM events e LEFT JOIN hackathons h ON h.event_id = e.id WHERE e.id = '${eventId}'`,
  )[0];

/** The wizard's three steps, online so no map is needed; returns the new hackathon's id. */
const createDraft = async (
  page: Page,
  locale: E2eLocale,
  title: string,
): Promise<string> => {
  const online = page.getByRole('radio', {
    name: t(locale, 'host_format_online'),
  });
  const inPerson = page.getByRole('radio', {
    name: t(locale, 'host_format_in_person'),
  });
  await expect(async () => {
    await page.locator('label', { has: inPerson }).click();
    await page.locator('label', { has: online }).click();
    await expect(page.locator('#host-meeting-url')).toBeVisible({
      timeout: 1_000,
    });
  }).toPass({ timeout: 30_000 });
  await page.locator('#host-meeting-url').fill(MEETING_URL);
  await nextButton(page, locale).click();

  await selectSchedule(page);
  await nextButton(page, locale).click();

  await fillDetails(page, {
    title,
    description: 'Seeded by the end-to-end run of the organiser flow.',
  });
  await page
    .getByRole('button', { name: t(locale, 'hackathon_save_draft') })
    .click();
  await page.waitForURL(/\/hackathon\/[^/]+\/manage/u, { timeout: 60_000 });
  await expect(
    page.getByText(t(locale, 'hackathon_manage_created')),
  ).toBeVisible({ timeout: 30_000 });
  const eventId = /\/hackathon\/([^/]+)\/manage/u.exec(page.url())?.[1];
  if (!eventId) throw new Error(`No hackathon in ${page.url()}`);
  return eventId;
};

/** Rules and dates, one track and a rubric: what a hackathon needs before it can be reviewed. */
const completeDraft = async (
  page: Page,
  locale: E2eLocale,
  eventId: string,
): Promise<void> => {
  const saved = savedHackathon(eventId);
  if (!saved) throw new Error('The draft was not saved');
  const dates: Record<string, number> = {
    registrationOpensAt: saved.starts_at - 10 * DAY_SECONDS,
    registrationClosesAt: saved.starts_at - DAY_SECONDS,
    submissionDeadlineAt: saved.ends_at - HOUR_SECONDS,
    judgingEndsAt: saved.ends_at + DAY_SECONDS,
  };
  for (const [field, seconds] of Object.entries(dates))
    await page.locator(`#hackathon-${field}`).fill(algiersInput(seconds));
  await page
    .getByRole('radio', { name: t(locale, 'hackathon_details_ai_disclosed') })
    .check();
  await page
    .getByRole('button', {
      name: t(locale, 'hackathon_details_save'),
      exact: true,
    })
    .click();
  await expect(
    page.getByText(t(locale, 'hackathon_details_saved')),
  ).toBeVisible({ timeout: 30_000 });

  const tracks = page.locator(
    'section[aria-labelledby="hackathon-tracks-heading"]',
  );
  await tracks
    .getByLabel(t(locale, 'hackathon_track_title'), { exact: true })
    .fill('Payments');
  await tracks
    .getByLabel(t(locale, 'hackathon_track_brief'), { exact: true })
    .fill('Help a corner shop take payments from its phone.');
  await tracks
    .getByRole('button', { name: t(locale, 'hackathon_tracks_save') })
    .click();
  await expect(
    tracks.getByText(t(locale, 'hackathon_tracks_saved')),
  ).toBeVisible({ timeout: 30_000 });

  const rubric = page.locator(
    'section[aria-labelledby="hackathon-rubric-heading"]',
  );
  const criteria = [
    ['Impact', '34'],
    ['Craft', '33'],
    ['Originality', '33'],
  ] as const;
  for (const [index, [name, weight]] of criteria.entries()) {
    await rubric
      .getByLabel(t(locale, 'hackathon_criterion_name'), { exact: true })
      .nth(index)
      .fill(name);
    await rubric
      .getByLabel(t(locale, 'hackathon_criterion_weight'), { exact: true })
      .nth(index)
      .fill(weight);
    await rubric
      .getByLabel(t(locale, 'hackathon_criterion_description'), { exact: true })
      .nth(index)
      .fill(`How well the project does on ${name.toLowerCase()}.`);
  }
  await rubric
    .getByRole('button', { name: t(locale, 'hackathon_rubric_save') })
    .click();
  await expect(
    rubric.getByText(t(locale, 'hackathon_rubric_saved')),
  ).toBeVisible({ timeout: 30_000 });
};

test.describe('an organiser creates a draft and an admin publishes it (B-LCH-02)', () => {
  let restoreFlag: () => void = () => undefined;
  let restoreOperator: () => void = () => undefined;
  let operatorEmail = '';
  let eventId: string | null = null;
  let organiser: Organiser | null = null;

  test.beforeAll(() => {
    organiser = organiserFor(localeFor(test.info().project.name));
    restoreFlag = turnOnHackathons();
    const operator = useOperator();
    operatorEmail = operator.email;
    restoreOperator = operator.restore;
    seedOrganisation(organiser);
  });

  test.afterAll(() => {
    if (eventId) cleanupHackathon(eventId, []);
    if (organiser) {
      d1(
        `DELETE FROM member WHERE id = '${organiser.memberId}'; DELETE FROM organization WHERE id = '${organiser.organisationId}';`,
      );
      cleanupRun({ eventIds: [], emails: [organiser.email] });
    }
    restoreOperator();
    restoreFlag();
  });

  test('from the wizard through automatic admin review to published', async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(300_000);
    const locale = localeFor(testInfo.project.name);
    const title = uniqueTitle(locale);
    const seeded = organiserFor(locale);
    const failures = watchForApplicationErrors(page);
    await useLocale(page, locale, baseURL as string);

    await signInBackTo(
      page,
      locale,
      seeded.email,
      `/${locale}/o/${seeded.slug}/hackathons/new`,
    );
    const id = await createDraft(page, locale, title);
    eventId = id;
    expect(savedHackathon(id)?.status).toBe('draft');

    await completeDraft(page, locale, id);
    expect(savedHackathon(id)).toMatchObject({
      status: 'draft',
      review_status: 'draft',
    });

    const adminContext = await browser.newContext({ baseURL: ADMIN_URL });
    const admin = await adminContext.newPage();
    await signInToAdmin(admin, operatorEmail, '/hackathons?page=0');
    const card = admin.getByRole('listitem').filter({
      has: admin.getByRole('heading', { name: title }),
    });
    const approve = card.getByRole('button', {
      name: t('ar', 'admin_hkn_approve'),
    });
    await expect(approve).toBeVisible({ timeout: 60_000 });
    await expect(async () => {
      if (await approve.isVisible()) await approve.click({ timeout: 2_000 });
      await expect(admin.getByText(t('ar', 'admin_hkn_decided'))).toBeVisible({
        timeout: 5_000,
      });
    }).toPass({ timeout: 60_000 });
    await adminContext.close();

    const published = savedHackathon(id);
    expect(published).toMatchObject({
      status: 'published',
      review_status: 'approved',
    });
    expect(
      d1(
        `SELECT 1 FROM operations_audit WHERE target_id = '${id}' AND action = 'approved'`,
      ),
    ).toHaveLength(1);

    await page.reload();
    await expect(
      page.getByText(t(locale, 'hackathon_banner_approved')),
    ).toBeVisible({ timeout: 30_000 });
    await page.goto(`/${locale}/algeria/e/${published?.slug}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible({
      timeout: 30_000,
    });
    expect(failures.filter((failure) => !isMapResponse(failure))).toEqual([]);
  });
});
