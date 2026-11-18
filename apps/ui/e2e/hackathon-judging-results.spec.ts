import { expect, test, type Browser, type Page } from '@playwright/test';

import {
  endJudging,
  frozenResults,
  hackathonFor,
  recusalCount,
  RUNNER_UP,
  scoreCount,
  seed,
  WINNER,
  type Hackathon,
} from './support/hackathon-judging';
import {
  acceptRole,
  inviteRole,
  MENTOR_HELP,
} from './support/hackathon-role-invites';
import { cleanupHackathon, turnOnHackathons } from './support/hackathons';
import { t, type E2eLocale } from './support/messages';
import { signInBackTo } from './support/profile-auth';

const LOCALES: readonly E2eLocale[] = ['ar', 'fr', 'en'];

/** A fresh browser context in `locale`, one per member, so their sessions never mix. */
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

/**
 * Press a score and wait for the form to take it.
 *
 * The form is server-rendered. A press that lands before React hydrates it checks the radio without
 * reaching the component, and pressing the same radio again changes nothing, so each attempt
 * presses a different score first.
 */
const pickScore = async (
  page: Page,
  criterionId: string,
  value: number,
): Promise<void> => {
  const option = (score: number) =>
    page.locator('label', {
      has: page.locator(`[id="judge-score-${criterionId}-${score}"]`),
    });
  await expect(async () => {
    await option(value === 1 ? 2 : 1).click({ timeout: 2_000 });
    await option(value).click({ timeout: 2_000 });
    await expect(option(value)).toHaveClass(/btn-primary/u, { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
};

/** Open an entry from the judge's list, score both criteria, and wait for the scores to save. */
const scoreEntry = async (
  page: Page,
  locale: E2eLocale,
  hackathon: Hackathon,
  title: string,
  values: readonly [number, number],
): Promise<void> => {
  await page.goto(`/${locale}/hackathon/${hackathon.eventId}/judge`);
  await page.getByRole('link', { name: title, exact: true }).click();
  await pickScore(page, hackathon.criteria[0], values[0]);
  await pickScore(page, hackathon.criteria[1], values[1]);
  await page
    .getByRole('button', { name: t(locale, 'hackathon_judging_save') })
    .click();
  await expect(
    page.getByText(t(locale, 'hackathon_judging_saved')),
  ).toBeVisible({ timeout: 30_000 });
};

/** Open an entry from the judge's list and recuse from it with a written reason. */
const recuseFrom = async (
  page: Page,
  locale: E2eLocale,
  hackathon: Hackathon,
  title: string,
): Promise<void> => {
  const judgePath = `/${locale}/hackathon/${hackathon.eventId}/judge`;
  await page.goto(judgePath);
  await page.getByRole('link', { name: title, exact: true }).click();
  const reason = page.getByLabel(t(locale, 'hackathon_judging_recuse_reason'));
  const before = recusalCount(hackathon);
  await expect(async () => {
    await reason.fill('I advised this team.', { timeout: 2_000 });
    await page
      .getByRole('button', {
        name: t(locale, 'hackathon_judging_recuse_button'),
        exact: true,
      })
      .click({ timeout: 2_000 });
    expect(recusalCount(hackathon)).toBe(before + 1);
  }).toPass({ timeout: 30_000 });
  await page.goto(judgePath);
  await expect(
    page.getByText(t(locale, 'hackathon_judging_state_recused'), {
      exact: true,
    }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole('link', { name: title, exact: true }),
  ).toHaveCount(0);
};

let restoreFlag: () => void = () => undefined;

test.beforeAll(() => {
  restoreFlag = turnOnHackathons();
});

test.afterAll(() => restoreFlag());

for (const locale of LOCALES) {
  test.describe(`judge and publish results (B-LCH-04, ${locale})`, () => {
    const hackathon = hackathonFor(locale);
    const eventPath = `/${locale}/algeria/e/${hackathon.slug}`;
    const judgePath = `/${locale}/hackathon/${hackathon.eventId}/judge`;
    const managePath = `/${locale}/hackathon/${hackathon.eventId}/manage`;
    const publicResults = (page: Page) =>
      page.locator('section[aria-labelledby="hackathon-results-heading"]');

    test.beforeAll(() => seed(hackathon));

    test.afterAll(() =>
      cleanupHackathon(
        hackathon.eventId,
        [
          hackathon.host.email,
          hackathon.scoringJudge.email,
          hackathon.recusingJudge.email,
          hackathon.mentor.email,
          hackathon.winnerCaptain.email,
          hackathon.runnerUpCaptain.email,
        ],
        [hackathon.organisationId],
      ),
    );

    test('a judge scores, another recuses, the organiser publishes, and the results show', async ({
      browser,
      baseURL,
      page,
    }) => {
      test.setTimeout(300_000);
      const organiser = await pageIn(browser, locale, baseURL as string);
      await signInBackTo(organiser, locale, hackathon.host.email, managePath);
      const scorerLink = await inviteRole(organiser, locale, 'judge');
      const recuserLink = await inviteRole(organiser, locale, 'judge');
      const mentorLink = await inviteRole(organiser, locale, 'mentor');

      const scorer = await pageIn(browser, locale, baseURL as string);
      await acceptRole(
        scorer,
        locale,
        hackathon.scoringJudge.email,
        scorerLink,
      );
      await expect(
        scorer.getByRole('link', { name: t(locale, 'hackathon_go_judging') }),
      ).toHaveAttribute('href', judgePath);
      await scoreEntry(scorer, locale, hackathon, WINNER, [5, 5]);
      await scoreEntry(scorer, locale, hackathon, RUNNER_UP, [3, 3]);

      const recuser = await pageIn(browser, locale, baseURL as string);
      await acceptRole(
        recuser,
        locale,
        hackathon.recusingJudge.email,
        recuserLink,
      );
      await recuseFrom(recuser, locale, hackathon, WINNER);
      await scoreEntry(recuser, locale, hackathon, RUNNER_UP, [2, 2]);

      expect(scoreCount(hackathon, hackathon.winnerId)).toBe(2);
      expect(scoreCount(hackathon, hackathon.runnerUpId)).toBe(4);
      expect(recusalCount(hackathon)).toBe(1);

      const mentor = await pageIn(browser, locale, baseURL as string);
      await acceptRole(
        mentor,
        locale,
        hackathon.mentor.email,
        mentorLink,
        true,
      );
      await page.goto(eventPath);
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(MENTOR_HELP, { exact: true })).toBeVisible();
      await expect(publicResults(page)).toHaveCount(0);

      endJudging(hackathon);
      await organiser.reload();
      const publish = organiser.getByRole('button', {
        name: t(locale, 'hackathon_results_panel_publish'),
        exact: true,
      });
      await expect(publish).toBeVisible({ timeout: 30_000 });
      await expect(
        organiser.getByLabel(t(locale, 'hackathon_results_panel_reason')),
      ).toHaveCount(0);
      const dialog = organiser.getByRole('dialog');
      await expect(async () => {
        await publish.click({ timeout: 2_000 });
        await expect(dialog).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 30_000 });
      await dialog
        .getByRole('button', {
          name: t(locale, 'hackathon_results_panel_publish'),
          exact: true,
        })
        .click();
      await expect(publish).toHaveCount(0, { timeout: 30_000 });

      expect(frozenResults(hackathon)).toEqual([
        { title: WINNER, rank: 1, total: 100 },
        { title: RUNNER_UP, rank: 2, total: 50 },
      ]);

      await page.goto(eventPath);
      const results = publicResults(page);
      await expect(results).toBeVisible({ timeout: 30_000 });
      await expect(results.getByText('Byte Club').first()).toBeVisible();
      const shown = await results.innerText();
      expect(shown.indexOf(WINNER)).toBeGreaterThan(-1);
      expect(shown.indexOf(WINNER)).toBeLessThan(shown.indexOf(RUNNER_UP));

      await scorer.context().close();
      await recuser.context().close();
      await mentor.context().close();
      await organiser.context().close();
    });
  });
}
