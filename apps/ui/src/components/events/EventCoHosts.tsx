import { Building2 } from 'lucide-react';
import { Fragment } from 'react';

import { event_run_by_organisations, type Locale } from '@founders-coffee/i18n';

import {
  coHostNames,
  type EventRunBy,
} from '../../features/events/event-run-by';

export const EventCoHosts = ({
  runBy,
  locale,
  className = '',
}: {
  runBy: EventRunBy;
  locale: Locale;
  className?: string;
}) => {
  const names = coHostNames(runBy);
  if (names.length === 0) return null;
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
        {names.map((name, index) => (
          <Fragment key={`${index}-${name}`}>
            {index > 0 ? separator : null}
            <bdi>{name}</bdi>
          </Fragment>
        ))}
      </span>
    </p>
  );
};
