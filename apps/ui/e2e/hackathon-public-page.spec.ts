import { expect, test } from '@playwright/test';

const pagePath = '/ar/algeria/e/dev-hackathon-registration';

const registrationSelector =
  'section[aria-labelledby="hackathon-registration-heading"]';
const descriptionSelector =
  'section[aria-labelledby="hackathon-description-heading"]';

test('makes the registration action and full description easy to find', async ({
  page,
}) => {
  await page.goto(pagePath);

  const hero = page.locator('article > header');
  const registration = page.locator(registrationSelector);
  const description = page.locator(descriptionSelector);

  await expect(hero.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(hero).toContainText('حضوريًا');
  await expect(hero).toContainText('هاكاثون تجريبي');
  await expect(registration).toBeVisible();
  await expect(description).toBeVisible();
  await expect(registration.locator('a')).toHaveAttribute('href', /redirect=/);
  await expect(page.locator('#hackathon-schedule-heading')).toBeVisible();

  const registrationPrecedesDescription = await page.evaluate(() => {
    const registration = document.querySelector(
      'section[aria-labelledby="hackathon-registration-heading"]',
    );
    const description = document.querySelector(
      'section[aria-labelledby="hackathon-description-heading"]',
    );
    return Boolean(
      registration &&
      description &&
      registration.compareDocumentPosition(description) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  expect(registrationPrecedesDescription).toBe(true);
});

test('serves accurate non-production SEO metadata and event structured data', async ({
  request,
}) => {
  const response = await request.get(pagePath);
  const html = await response.text();

  expect(response.status()).toBe(200);
  expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
  expect(html).toContain(
    '<link rel="canonical" href="http://localhost:3000/ar/algeria/e/dev-hackathon-registration"',
  );
  expect(html).toContain('hrefLang="ar"');
  expect(html).toContain('hrefLang="en"');
  expect(html).toContain('hrefLang="fr"');
  expect(html).toContain('hrefLang="x-default"');
  expect(html.match(/<h1\b/g)).toHaveLength(1);

  const structuredData = [
    ...html.matchAll(
      /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
    ),
  ].map((match) => JSON.parse(match[1] ?? '{}') as Record<string, unknown>);
  const eventData = structuredData.find((data) => data['@type'] === 'Event');

  expect(eventData).toMatchObject({
    name: 'هاكاثون الجزائر — التسجيل مفتوح',
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    startDate: expect.any(String),
    endDate: expect.any(String),
    organizer: { name: 'Code Club Alger' },
  });
});

test('fits the Arabic hackathon page from narrow mobile through wide desktop', async ({
  page,
}) => {
  await page.goto(pagePath);

  for (const width of [320, 375, 430, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(registrationSelector)).toBeVisible();

    const layout = await page.evaluate(() => {
      const registration = document
        .querySelector(
          'section[aria-labelledby="hackathon-registration-heading"]',
        )
        ?.getBoundingClientRect();
      const description = document
        .querySelector(
          'section[aria-labelledby="hackathon-description-heading"]',
        )
        ?.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        registrationTop: registration?.top ?? Number.NaN,
        registrationBottom: registration?.bottom ?? Number.NaN,
        registrationLeft: registration?.left ?? Number.NaN,
        descriptionTop: description?.top ?? Number.NaN,
        descriptionLeft: description?.left ?? Number.NaN,
      };
    });

    expect(
      layout.documentWidth,
      `horizontal overflow at ${width}px`,
    ).toBeLessThanOrEqual(layout.viewportWidth);
    if (width < 1024) {
      expect(layout.registrationBottom).toBeLessThanOrEqual(
        layout.descriptionTop,
      );
    } else {
      expect(
        Math.abs(layout.registrationTop - layout.descriptionTop),
      ).toBeLessThan(120);
      expect(
        Math.abs(layout.registrationLeft - layout.descriptionLeft),
      ).toBeGreaterThan(300);
    }
  }
});

test('renders localized event format and page metadata in French and English', async ({
  page,
}) => {
  for (const [locale, direction, format] of [
    ['fr', 'ltr', 'En présentiel'],
    ['en', 'ltr', 'In person'],
  ] as const) {
    await page.goto(`/${locale}/algeria/e/dev-hackathon-registration`);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', direction);
    await expect(page.locator('article > header h1')).toHaveCount(1);
    await expect(page.locator('article > header')).toContainText(format);
    await expect(page.locator(descriptionSelector)).toBeVisible();
  }
});
