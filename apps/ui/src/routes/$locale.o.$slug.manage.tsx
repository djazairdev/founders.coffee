import { createFileRoute } from '@tanstack/react-router';

import { org_manage_title } from '@founders-coffee/i18n';

import { requireSession } from '../features/auth/require-session';
import { MyOrganisationPage } from '../features/organisations/components/MyOrganisationPage';
import { NO_INDEX_VALUE } from '../lib/indexation';
import { privatePageHead } from '../lib/seo-private';

const MyOrganisationRoute = () => {
  const { locale, markets } = Route.useRouteContext();
  const { slug } = Route.useParams();
  return <MyOrganisationPage slug={slug} locale={locale} markets={markets} />;
};

export const Route = createFileRoute('/$locale/o/$slug/manage')({
  beforeLoad: async ({ location, context }) => {
    await requireSession(context.locale, location.href);
  },
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': NO_INDEX_VALUE,
  }),
  component: MyOrganisationRoute,
  head: ({ match }) =>
    privatePageHead(org_manage_title({}, { locale: match.context.locale })),
});
