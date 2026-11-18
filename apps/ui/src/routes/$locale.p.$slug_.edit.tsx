import { createFileRoute } from '@tanstack/react-router';

import { project_edit_title } from '@founders-coffee/i18n';

import { requireSession } from '../features/auth/require-session';
import { ProjectEditPage } from '../features/projects/components/ProjectEditPage';
import { NO_INDEX_VALUE } from '../lib/indexation';
import { privatePageHead } from '../lib/seo-private';

const ProjectEditRoute = () => {
  const { locale } = Route.useRouteContext();
  const { slug } = Route.useParams();
  return <ProjectEditPage slug={slug} locale={locale} />;
};

export const Route = createFileRoute('/$locale/p/$slug_/edit')({
  beforeLoad: async ({ location, context }) => {
    await requireSession(context.locale, location.href);
  },
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': NO_INDEX_VALUE,
  }),
  component: ProjectEditRoute,
  head: ({ match }) =>
    privatePageHead(project_edit_title({}, { locale: match.context.locale })),
});
