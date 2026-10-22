import { expect, test, type Browser, type Page } from '@playwright/test';

import { cleanupRun, d1 } from './support/d1';
import { t, type E2eLocale } from './support/messages';
import { signInBackTo } from './support/profile-auth';
import { newId, RUN_ID } from './support/run';

const LOCALES: readonly E2eLocale[] = ['ar', 'fr', 'en'];
const HOUR_SECONDS = 3_600;
const DAY_SECONDS = 86_400;
const REPOSITORY = 'https://github.com/e2e-team/ledger';

/** The rows one locale's run writes, named by its locale and the run so parallel runs never meet. */
const hackathonFor = (locale: E2eLocale) => ({
  eventId: newId('evt'),
  trackId: newId('trk'),
  hostId: `usr_e2e_hkn_team_${locale}_${RUN_ID}`,
  hostEmail: `e2e-hkn-team-host-${locale}-${RUN_ID}@e2e.invalid`,
  captainEmail: `e2e-hkn-team-captain-${locale}-${RUN_ID}@e2e.invalid`,
  mateEmail: `e2e-hkn-team-mate-${locale}-${RUN_ID}@e2e.invalid`,
  slug: `e2e-hkn-team-${locale}-${RUN_ID}`,
  title: `E2E hackathon ${locale} ${RUN_ID}`,
  teamName: `E2E team ${locale} ${RUN_ID}`,
});

type Hackathon = ReturnType<typeof hackathonFor>;

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

const setHackathons = (isOn: boolean): void => {
  d1(
    `UPDATE markets SET feature_flags = json_set(feature_flags, '$.hackathons', json('${isOn ? 'true' : 'false'}')) WHERE code = 'DZ'`,
  );
};

/**
 * A published in-person hackathon in Algiers whose registration is open: it starts tomorrow, takes
 * submissions for three days after that, and has one track.
 */
const seed = (hackathon: Hackathon): void => {
  const now = nowSeconds();
  const startsAt = now + DAY_SECONDS;
  const deadline = startsAt + 3 * DAY_SECONDS;
  d1(
    `INSERT INTO user (id, name, email) VALUES ('${hackathon.hostId}', 'Host ${RUN_ID}', '${hackathon.hostEmail}'); ` +
      `INSERT INTO events (id, host_id, market_code, state_code, city_code, title, description, venue, starts_at, ends_at, language, languages, slug, kind, status, format) ` +
      `VALUES ('${hackathon.eventId}', '${hackathon.hostId}', 'DZ', '16', '556', '${hackathon.title}', 'Seeded for registering, forming a team and submitting.', 'Café E2E', ${startsAt}, ${deadline + HOUR_SECONDS}, 'en', json_array('en'), '${hackathon.slug}', 'hackathon', 'published', 'in_person'); ` +
      `INSERT INTO hackathons (event_id, attendance_modes, team_min, team_max, registration_opens_at, registration_closes_at, submission_deadline_at, judging_ends_at, ai_policy, review_status) ` +
      `VALUES ('${hackathon.eventId}', json_array('in_person'), 1, 4, ${now - DAY_SECONDS}, ${startsAt - HOUR_SECONDS}, ${deadline}, ${deadline + 4 * DAY_SECONDS}, 'disclosed', 'approved'); ` +
      `INSERT INTO hackathon_tracks (id, event_id, kind, title, brief, position) ` +
      `VALUES ('${hackathon.trackId}', '${hackathon.eventId}', 'founder_problem', 'Payments', 'Help a corner shop take payments.', 0);`,
  );
};

/** Move the hackathon on to building: registration closed two hours ago, kickoff an hour ago. */
const startBuilding = (hackathon: Hackathon): void => {
  const now = nowSeconds();
  d1(
    `UPDATE hackathons SET registration_closes_at = ${now - 2 * HOUR_SECONDS} WHERE event_id = '${hackathon.eventId}'; ` +
      `UPDATE events SET starts_at = ${now - HOUR_SECONDS} WHERE id = '${hackathon.eventId}';`,
  );
};

const HACKATHON_TABLES = [
  'hackathon_submissions',
  'hackathon_team_requests',
  'hackathon_team_members',
  'hackathon_teams',
  'hackathon_registrations',
  'hackathon_tracks',
  'scheduled_notifications',
  'hackathons',
];

/** Remove what {@link seed} and the run wrote, event by event, then its members. */
const cleanup = (hackathon: Hackathon): void => {
  d1(
    `DELETE FROM hackathon_submission_versions WHERE submission_id IN (SELECT id FROM hackathon_submissions WHERE event_id = '${hackathon.eventId}'); ` +
      `DELETE FROM hackathon_team_invites WHERE team_id IN (SELECT id FROM hackathon_teams WHERE event_id = '${hackathon.eventId}');`,
  );
  for (const table of HACKATHON_TABLES)
    d1(`DELETE FROM ${table} WHERE event_id = '${hackathon.eventId}'`);
  cleanupRun({
    eventIds: [hackathon.eventId],
    emails: [hackathon.hostEmail, hackathon.captainEmail, hackathon.mateEmail],
  });
};

/** Where the run stands in D1: the members' registrations, the team's size and its entry. */
const standing = (hackathon: Hackathon) => {
  const [row] = d1<{
    registered: number;
    members: number;
    status: string | null;
    title: string | null;
  }>(
    `SELECT (SELECT count(*) FROM hackathon_registrations WHERE event_id = '${hackathon.eventId}' AND status = 'registered') AS registered, ` +
      `(SELECT count(*) FROM hackathon_team_members m JOIN hackathon_teams t ON t.id = m.team_id WHERE t.event_id = '${hackathon.eventId}') AS members, ` +
      `(SELECT status FROM hackathon_submissions WHERE event_id = '${hackathon.eventId}') AS status, ` +
      `(SELECT title FROM hackathon_submissions WHERE event_id = '${hackathon.eventId}') AS title`,
  );
  return row;
};

/**
 * Sign a member in from the hackathon's page, register them, and wait for the card to say so.
 *
 * The card is server-rendered, and a press that lands before React hydrates it does nothing, so
 * the press is repeated until the registration shows.
 */
const register = async (
  page: Page,
  locale: E2eLocale,
  email: string,
  path: string,
): Promise<void> => {
  await signInBackTo(page, locale, email, path);
  const conduct = page.locator('#hackathon-register-conduct');
  await expect(async () => {
    await conduct.check({ timeout: 2_000 });
    await page
      .getByRole('button', { name: t(locale, 'hackathon_register_submit') })
      .click({ timeout: 2_000 });
    await expect(page.getByText(t(locale, 'hackathon_registered'))).toBeVisible(
      { timeout: 3_000 },
    );
  }).toPass({ timeout: 30_000 });
};

/** A fresh browser context in `locale`, for a second member signed in alongside the first. */
const pageIn = async (
  browser: Browser,
  locale: E2eLocale,
  baseURL: string,
): Promise<Page> => {
  const context = await browser.newContext({ baseURL });
  await context.addCookies([
    { name: 'PARAGLIDE_LOCALE', value: locale, url: baseURL },
  ]);
  return context.newPage();
};

let wasOn = false;

/** Turn hackathons on in Algeria for the run, remembering whether they were, to put it back. */
test.beforeAll(() => {
  wasOn =
    d1<{ isOn: number | null }>(
      `SELECT json_extract(feature_flags, '$.hackathons') AS isOn FROM markets WHERE code = 'DZ'`,
    )[0]?.isOn === 1;
  setHackathons(true);
});

test.afterAll(() => setHackathons(wasOn));

for (const locale of LOCALES) {
  test.describe(`register, form a team and submit (B-LCH-03, ${locale})`, () => {
    const hackathon = hackathonFor(locale);
    const eventPath = `/${locale}/algeria/e/${hackathon.slug}`;
    const teamPath = `/${locale}/hackathon/${hackathon.eventId}/team`;
    const submitPath = `/${locale}/hackathon/${hackathon.eventId}/submit`;

    test.beforeAll(() => seed(hackathon));

    test.afterAll(() => cleanup(hackathon));

    test('two members register, one invites the other, and the captain submits before the deadline', async ({
      browser,
      baseURL,
    }) => {
      test.setTimeout(300_000);
      const captain = await pageIn(browser, locale, baseURL as string);
      const mate = await pageIn(browser, locale, baseURL as string);

      await register(captain, locale, hackathon.captainEmail, eventPath);
      await register(mate, locale, hackathon.mateEmail, eventPath);
      expect(standing(hackathon)?.registered).toBe(2);

      await captain.goto(teamPath);
      await expect(async () => {
        await captain
          .locator('#hackathon-team-name')
          .fill(hackathon.teamName, { timeout: 2_000 });
        await captain
          .getByRole('button', { name: t(locale, 'hackathon_team_create') })
          .click({ timeout: 2_000 });
        await expect(
          captain.getByRole('heading', { name: hackathon.teamName }),
        ).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 30_000 });

      await captain
        .getByRole('button', { name: t(locale, 'hackathon_team_invite_make') })
        .click();
      const inviteField = captain.locator('#hackathon-team-invite-link');
      await expect(inviteField).toBeVisible({ timeout: 15_000 });
      const invite = new URL(await inviteField.inputValue());
      expect(invite.pathname).toBe(teamPath);
      expect(invite.searchParams.get('join')).toMatch(/^[A-Za-z0-9_-]{43}$/u);

      await mate.goto(`${invite.pathname}${invite.search}`);
      const join = mate.locator(
        'section[aria-labelledby="hackathon-team-join-heading"]',
      );
      await expect(async () => {
        await join
          .getByRole('button', { name: t(locale, 'hackathon_team_join') })
          .click({ timeout: 2_000 });
        await expect(
          mate.getByRole('heading', { name: hackathon.teamName }),
        ).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 30_000 });
      expect(new URL(mate.url()).searchParams.has('join')).toBe(false);
      expect(standing(hackathon)?.members).toBe(2);

      startBuilding(hackathon);
      await captain.goto(submitPath);
      await expect(
        captain.getByRole('heading', {
          name: t(locale, 'hackathon_submission_title'),
          level: 1,
        }),
      ).toBeVisible();
      await expect(async () => {
        await captain
          .locator('#hackathon-submission-track')
          .selectOption(hackathon.trackId, { timeout: 2_000 });
        await expect(
          captain.locator('#hackathon-submission-track'),
        ).toHaveValue(hackathon.trackId, { timeout: 1_000 });
      }).toPass({ timeout: 30_000 });
      await captain.locator('#hackathon-submission-title').fill('Ledger');
      await captain
        .locator('#hackathon-submission-description')
        .fill('A ledger a corner shop keeps on its phone.');
      await captain
        .locator('#hackathon-submission-repository')
        .fill(REPOSITORY);
      await captain
        .locator('#hackathon-submission-ai-statement')
        .fill('We wrote every line ourselves and used no AI tools.');
      await captain.locator('#hackathon-submission-original').check();
      await captain
        .getByRole('button', { name: t(locale, 'hackathon_submission_submit') })
        .click();

      await expect(
        captain.getByRole('button', {
          name: t(locale, 'hackathon_submission_submit_again'),
        }),
      ).toBeVisible({ timeout: 30_000 });
      expect(standing(hackathon)).toMatchObject({
        status: 'submitted',
        title: 'Ledger',
      });

      await mate.goto(submitPath);
      await expect(mate.locator('#hackathon-submission-title')).toHaveValue(
        'Ledger',
        { timeout: 30_000 },
      );
      await expect(
        mate.getByText(t(locale, 'hackathon_submission_captain_only')),
      ).toBeVisible();

      await captain.context().close();
      await mate.context().close();
    });
  });
}
