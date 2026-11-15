import { Link } from '@tanstack/react-router';

import { profile_organisations_title, type Locale } from '@founders-coffee/i18n';

import { localizedMyOrganisation } from '../lib/locale-routing';

export const OrganisationBreadcrumbs = ({
  locale,
  organisationName,
  organisationSlug,
}: {
  locale: Locale;
  organisationName: string;
  organisationSlug?: string;
}) => {
  const label = profile_organisations_title({}, { locale });

  return (
    <nav className="breadcrumbs mb-3 text-body-sm" aria-label={label}>
      <ul>
        <li>
          <Link to="/$locale/profile/organisations" params={{ locale }}>
            {label}
          </Link>
        </li>
        <li aria-current={organisationSlug ? undefined : 'page'}>
          {organisationSlug ? (
            <Link {...localizedMyOrganisation(locale, organisationSlug)}>
              <bdi>{organisationName}</bdi>
            </Link>
          ) : (
            <bdi>{organisationName}</bdi>
          )}
        </li>
      </ul>
    </nav>
  );
};
