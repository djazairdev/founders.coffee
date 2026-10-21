import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { title, type Locale } from '@founders-coffee/i18n';

import { LocaleToggle } from '../features/shell/LocaleToggle';

export const AdminPage = ({
  locale,
  heading,
  isHome = false,
  children,
}: {
  locale: Locale;
  heading: string;
  isHome?: boolean;
  children: ReactNode;
}) => (
  <main className="mx-auto max-w-3xl p-4 sm:p-8">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        {isHome ? null : (
          <Link className="link text-caption text-neutral" to="/">
            {title({}, { locale })}
          </Link>
        )}
        <h1 className="font-display text-h3">{heading}</h1>
      </div>
      <LocaleToggle active={locale} />
    </header>
    {children}
  </main>
);
