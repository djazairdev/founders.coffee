import { createFileRoute } from '@tanstack/react-router';

import { hackathon_judging_title } from '@founders-coffee/i18n';

import { requireSession } from '../features/auth/require-session';
import { HackathonJudgePage } from '../features/hackathons/components/HackathonJudgePage';
import { NO_INDEX_VALUE } from '../lib/indexation';
import { privatePageHead } from '../lib/seo-private';

const HackathonJudgeRoute = () => {
  const { locale, markets } = Route.useRouteContext();
  const { eventId } = Route.useParams();
  return (
    <HackathonJudgePage eventId={eventId} locale={locale} markets={markets} />
  );
};

export const Route = createFileRoute('/$locale/hackathon/$eventId/judge')({
  beforeLoad: async ({ location, context }) => {
    await requireSession(context.locale, location.href);
  },
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': NO_INDEX_VALUE,
  }),
  component: HackathonJudgeRoute,
  head: ({ match }) =>
    privatePageHead(
      hackathon_judging_title({}, { locale: match.context.locale }),
    ),
});
