import { Link } from '@tanstack/react-router';
import { Building2 } from 'lucide-react';
import { Fragment } from 'react';

import { event_run_by_organisations, type Locale } from '@founders-coffee/i18n';

import { coHosts, type EventRunBy } from '../../features/events/event-run-by';
import { localizedOrganisation } from '../../lib/locale-routing';

export const EventCoHosts = ({
  runBy,
  locale,
  isLinked = false,
  className = '',
}: {
  runBy: EventRunBy;
  locale: Locale;
  isLinked?: boolean;
  className?: string;
}) => {
  const organisations = coHosts(runBy);
  if (organisations.length === 0) return null;
  const separator = locale === 'ar' ? '، ' : ', ';

  return (
    <p
      className={`flex items-start gap-1.5 text-body-sm text-neutral ${className}`}
    >
      <Building2
        className="mt-0.5 size-4 shrink-0 text-secondary"
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="sr-only">
          {event_run_by_organisations({}, { locale })}{' '}
        </span>
        {organisations.map((organisation, index) => (
          <Fragment key={organisation.slug}>
            {index > 0 ? separator : null}
            {isLinked ? (
              <Link
                {...localizedOrganisation(locale, organisation.slug)}
                className="link link-hover"
              >
                <bdi>{organisation.name}</bdi>
              </Link>
            ) : (
              <bdi>{organisation.name}</bdi>
            )}
          </Fragment>
        ))}
      </span>
    </p>
  );
};
