import { Link } from '@tanstack/react-router';

import { org_page_manage, type Locale } from '@founders-coffee/i18n';

import { useAuth } from '../../../lib/app-providers';
import { localizedMyOrganisation } from '../../../lib/locale-routing';
import { useMyOrganisations } from '../hooks';

export const OrganisationManageLink = ({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) => {
  const { isAuthenticated } = useAuth();
  const organisations = useMyOrganisations(isAuthenticated).data ?? [];
  if (!organisations.some((organisation) => organisation.slug === slug))
    return null;
  return (
    <Link
      {...localizedMyOrganisation(locale, slug)}
      className="btn btn-outline btn-xs shrink-0 self-start sm:btn-sm md:btn-md"
    >
      {org_page_manage({}, { locale })}
    </Link>
  );
};
