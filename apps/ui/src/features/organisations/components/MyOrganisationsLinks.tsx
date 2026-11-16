import { Link } from '@tanstack/react-router';

import { activity_organisations, type Locale } from '@founders-coffee/i18n';

import { useAuth } from '../../../lib/app-providers';
import { localizedMyOrganisation } from '../../../lib/locale-routing';
import { useMyOrganisations } from '../hooks';

export const MyOrganisationsLinks = ({ locale }: { locale: Locale }) => {
  const { isAuthenticated } = useAuth();
  const organisations = useMyOrganisations(isAuthenticated).data ?? [];
  if (organisations.length === 0) return null;
  return (
    <section aria-labelledby="my-organisations-heading" className="mb-6">
      <h2 id="my-organisations-heading" className="mb-2 font-display text-h4">
        {activity_organisations({}, { locale })}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {organisations.map((organisation) => (
          <li key={organisation.id}>
            <Link
              {...localizedMyOrganisation(locale, organisation.slug)}
              className="btn btn-outline btn-xs sm:btn-sm md:btn-md"
            >
              <bdi>{organisation.name}</bdi>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
