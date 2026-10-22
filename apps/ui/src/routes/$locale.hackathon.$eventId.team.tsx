import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { hackathon_team_title } from '@founders-coffee/i18n';

import { requireSession } from '../features/auth/require-session';
import { HackathonTeamPage } from '../features/hackathons/components/HackathonTeamPage';
import { NO_INDEX_VALUE } from '../lib/indexation';
import { privatePageHead } from '../lib/seo-private';

const HackathonTeamRoute = () => {
  const { locale, markets } = Route.useRouteContext();
  const { eventId } = Route.useParams();
  const { join } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <HackathonTeamPage
      eventId={eventId}
      locale={locale}
      markets={markets}
      joinToken={join}
      onTokenUsed={() => void navigate({ search: {}, replace: true })}
    />
  );
};

export const Route = createFileRoute('/$locale/hackathon/$eventId/team')({
  beforeLoad: async ({ location, context }) => {
    await requireSession(context.locale, location.href);
  },
  validateSearch: z.object({
    join: z
      .string()
      .regex(/^[A-Za-z0-9_-]{43}$/)
      .optional()
      .catch(undefined),
  }),
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': NO_INDEX_VALUE,
  }),
  component: HackathonTeamRoute,
  head: ({ match }) =>
    privatePageHead(hackathon_team_title({}, { locale: match.context.locale })),
});
