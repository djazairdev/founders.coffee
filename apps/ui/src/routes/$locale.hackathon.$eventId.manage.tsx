import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { hackathon_manage_title } from '@founders-coffee/i18n';

import { requireSession } from '../features/auth/require-session';
import { HackathonManagePage } from '../features/hackathons/components/HackathonManagePage';
import { NO_INDEX_VALUE } from '../lib/indexation';
import { privatePageHead } from '../lib/seo-private';

const HackathonManageRoute = () => {
  const { locale, markets } = Route.useRouteContext();
  const { eventId } = Route.useParams();
  const { created } = Route.useSearch();
  return (
    <HackathonManagePage
      eventId={eventId}
      locale={locale}
      markets={markets}
      isJustCreated={created === true}
    />
  );
};

export const Route = createFileRoute('/$locale/hackathon/$eventId/manage')({
  beforeLoad: async ({ location, context }) => {
    await requireSession(context.locale, location.href);
  },
  validateSearch: z.object({
    created: z.boolean().optional().catch(undefined),
  }),
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': NO_INDEX_VALUE,
  }),
  component: HackathonManageRoute,
  head: ({ match }) =>
    privatePageHead(
      hackathon_manage_title({}, { locale: match.context.locale }),
    ),
});
