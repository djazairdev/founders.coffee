import { createFileRoute } from '@tanstack/react-router';

import { org_invitation_title } from '@founders-coffee/i18n';

import { requireSession } from '../features/auth/require-session';
import { OrganisationInvitationPage } from '../features/organisations/components/OrganisationInvitationPage';
import { NO_INDEX_VALUE } from '../lib/indexation';
import { privatePageHead } from '../lib/seo-private';

const OrganisationInvitationRoute = () => {
  const { locale, markets } = Route.useRouteContext();
  const { invitationId } = Route.useParams();
  return (
    <OrganisationInvitationPage
      invitationId={invitationId}
      locale={locale}
      markets={markets}
    />
  );
};

export const Route = createFileRoute('/$locale/o/invitations/$invitationId')({
  beforeLoad: async ({ location, context }) => {
    await requireSession(context.locale, location.href);
  },
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': NO_INDEX_VALUE,
  }),
  component: OrganisationInvitationRoute,
  head: ({ match }) =>
    privatePageHead(org_invitation_title({}, { locale: match.context.locale })),
});
