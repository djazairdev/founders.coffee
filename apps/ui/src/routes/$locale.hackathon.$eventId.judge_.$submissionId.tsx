import { createFileRoute } from '@tanstack/react-router';

import { hackathon_judging_title } from '@founders-coffee/i18n';

import { requireSession } from '../features/auth/require-session';
import { HackathonJudgeEntryPage } from '../features/hackathons/components/HackathonJudgeEntryPage';
import { NO_INDEX_VALUE } from '../lib/indexation';
import { privatePageHead } from '../lib/seo-private';

const HackathonJudgeEntryRoute = () => {
  const { locale, markets } = Route.useRouteContext();
  const { eventId, submissionId } = Route.useParams();
  return (
    <HackathonJudgeEntryPage
      eventId={eventId}
      submissionId={submissionId}
      locale={locale}
      markets={markets}
    />
  );
};

export const Route = createFileRoute(
  '/$locale/hackathon/$eventId/judge_/$submissionId',
)({
  beforeLoad: async ({ location, context }) => {
    await requireSession(context.locale, location.href);
  },
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': NO_INDEX_VALUE,
  }),
  component: HackathonJudgeEntryRoute,
  head: ({ match }) =>
    privatePageHead(
      hackathon_judging_title({}, { locale: match.context.locale }),
    ),
});
