import { createFileRoute, notFound } from '@tanstack/react-router';

import { appErrorCode } from '@founders-coffee/core';

import { projectsApi, type ProjectPage } from '../features/projects/api';
import { ProjectPublicPage } from '../features/projects/components/ProjectPublicPage';
import { getSiteOrigin } from '../lib/seo';
import { projectPageHead } from '../lib/seo-project';

const ProjectRoute = () => {
  const { locale } = Route.useRouteContext();
  const project = Route.useLoaderData();
  return <ProjectPublicPage project={project} locale={locale} />;
};

export const Route = createFileRoute('/$locale/p/$slug')({
  component: ProjectRoute,
  loader: async ({ params }): Promise<ProjectPage> => {
    try {
      return await projectsApi.page(params.slug);
    } catch (error) {
      const code = appErrorCode(error);
      if (code === 'project_not_found' || code === 'validation_failed')
        throw notFound();
      throw error;
    }
  },
  head: ({ loaderData, match }) =>
    loaderData
      ? projectPageHead({
          locale: match.context.locale,
          title: loaderData.title,
          problem: loaderData.problem,
          websiteUrl: loaderData.websiteUrl,
          updatedAt: loaderData.updatedAt,
          marketCode: loaderData.marketCode,
          isSearchIndexable: loaderData.isSearchIndexable,
          members: loaderData.members.map(({ userId, name }) => ({
            name,
            url: `${getSiteOrigin()}/${match.context.locale}/u/${encodeURIComponent(userId)}`,
          })),
          route: {
            type: 'project',
            slug: loaderData.slug,
            locale: match.context.locale,
          },
        })
      : { meta: [], links: [] },
});
