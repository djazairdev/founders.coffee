import { createFileRoute } from '@tanstack/react-router';

import { hackathon_role_invitation_title } from '@founders-coffee/i18n';

import { requireSession } from '../features/auth/require-session';
import { HackathonRoleInvitationPage } from '../features/hackathons/components/HackathonRoleInvitationPage';
import { roleInvitationSearch } from '../features/hackathons/role-invitations';
import { NO_INDEX_VALUE } from '../lib/indexation';
import { privatePageHead } from '../lib/seo-private';

const HackathonRoleInvitationRoute = () => {
  const { locale, markets } = Route.useRouteContext();
  const { role, token } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <HackathonRoleInvitationPage
      request={role && token ? { role, token } : undefined}
      locale={locale}
      markets={markets}
      onAnswered={() => void navigate({ search: {}, replace: true })}
    />
  );
};

export const Route = createFileRoute('/$locale/hackathon/invitation')({
  beforeLoad: async ({ location, context }) => {
    await requireSession(context.locale, location.href);
  },
  validateSearch: roleInvitationSearch,
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': NO_INDEX_VALUE,
  }),
  component: HackathonRoleInvitationRoute,
  head: ({ match }) =>
    privatePageHead(
      hackathon_role_invitation_title({}, { locale: match.context.locale }),
    ),
});
