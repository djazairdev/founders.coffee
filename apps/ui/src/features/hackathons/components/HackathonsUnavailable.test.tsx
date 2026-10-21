import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LOCALES } from '@founders-coffee/i18n';

import { HackathonsUnavailable } from './HackathonsUnavailable';

const TEXT = {
  ar: 'الهاكاثونات غير متاحة في هذا البلد بعد.',
  fr: 'Les hackathons ne sont pas encore ouverts dans ce pays.',
  en: 'Hackathons aren’t open in this country yet.',
} as const;

describe('HackathonsUnavailable', () => {
  afterEach(cleanup);

  it.each(LOCALES)('tells the member plainly in %s', (locale) => {
    render(<HackathonsUnavailable locale={locale} />);

    expect(screen.getByRole('status').textContent).toBe(TEXT[locale]);
  });
});
