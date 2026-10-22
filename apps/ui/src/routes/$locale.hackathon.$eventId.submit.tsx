import { createFileRoute } from '@tanstack/react-router';

import { hackathon_submission_title } from '@founders-coffee/i18n';

import { requireSession } from '../features/auth/require-session';
import { HackathonSubmitPage } from '../features/hackathons/components/HackathonSubmitPage';
import { NO_INDEX_VALUE } from '../lib/indexation';
import { privatePageHead } from '../lib/seo-private';

const HackathonSubmitRoute = () => {
  const { locale, markets } = Route.useRouteContext();
  const { eventId } = Route.useParams();
  return (
    <HackathonSubmitPage eventId={eventId} locale={locale} markets={markets} />
  );
};

export const Route = createFileRoute('/$locale/hackathon/$eventId/submit')({
  beforeLoad: async ({ location, context }) => {
    await requireSession(context.locale, location.href);
  },
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': NO_INDEX_VALUE,
  }),
  component: HackathonSubmitRoute,
  head: ({ match }) =>
    privatePageHead(
      hackathon_submission_title({}, { locale: match.context.locale }),
    ),
});
