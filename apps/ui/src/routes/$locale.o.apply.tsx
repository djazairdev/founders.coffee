import { createFileRoute } from '@tanstack/react-router';

import { org_apply_title } from '@founders-coffee/i18n';

import { requireSession } from '../features/auth/require-session';
import { OrganisationApplyPage } from '../features/organisations/components/OrganisationApplyPage';
import { NO_INDEX_VALUE } from '../lib/indexation';
import { privatePageHead } from '../lib/seo-private';

const OrganisationApplyRoute = () => {
  const { locale, markets, activeMarket } = Route.useRouteContext();
  return (
    <OrganisationApplyPage
      defaultMarketCode={activeMarket?.code ?? markets[0]?.code ?? ''}
      locale={locale}
      markets={markets}
    />
  );
};

export const Route = createFileRoute('/$locale/o/apply')({
  beforeLoad: async ({ location, context }) => {
    await requireSession(context.locale, location.href);
  },
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': NO_INDEX_VALUE,
  }),
  component: OrganisationApplyRoute,
  head: ({ match }) =>
    privatePageHead(org_apply_title({}, { locale: match.context.locale })),
});
