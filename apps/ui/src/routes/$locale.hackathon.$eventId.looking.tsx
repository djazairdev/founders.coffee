import { createFileRoute } from '@tanstack/react-router';

import { hackathon_looking_title } from '@founders-coffee/i18n';

import { requireSession } from '../features/auth/require-session';
import { HackathonLookingPage } from '../features/hackathons/components/HackathonLookingPage';
import { NO_INDEX_VALUE } from '../lib/indexation';
import { privatePageHead } from '../lib/seo-private';

const HackathonLookingRoute = () => {
  const { locale, markets } = Route.useRouteContext();
  const { eventId } = Route.useParams();
  return (
    <HackathonLookingPage eventId={eventId} locale={locale} markets={markets} />
  );
};

export const Route = createFileRoute('/$locale/hackathon/$eventId/looking')({
  beforeLoad: async ({ location, context }) => {
    await requireSession(context.locale, location.href);
  },
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': NO_INDEX_VALUE,
  }),
  component: HackathonLookingRoute,
  head: ({ match }) =>
    privatePageHead(
      hackathon_looking_title({}, { locale: match.context.locale }),
    ),
});
