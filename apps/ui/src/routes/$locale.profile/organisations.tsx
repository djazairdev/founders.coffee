import { createFileRoute } from '@tanstack/react-router';

import { profile_organisations_title } from '@founders-coffee/i18n';

import { OrganisationManagementPage } from '../../features/organisations/components/OrganisationManagementPage';
import { requireSession } from '../../features/auth/require-session';
import { NO_INDEX_VALUE } from '../../lib/indexation';
import { privatePageHead } from '../../lib/seo-private';

const OrganisationManagementRoute = () => {
  const { locale } = Route.useRouteContext();
  return <OrganisationManagementPage locale={locale} />;
};

export const Route = createFileRoute('/$locale/profile/organisations')({
  beforeLoad: async ({ location, context }) => {
    await requireSession(context.locale, location.href);
  },
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': NO_INDEX_VALUE,
  }),
  component: OrganisationManagementRoute,
  head: ({ match }) =>
    privatePageHead(
      profile_organisations_title({}, { locale: match.context.locale }),
    ),
});
