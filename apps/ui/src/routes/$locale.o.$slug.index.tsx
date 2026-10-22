import { createFileRoute, notFound } from '@tanstack/react-router';

import { appErrorCode } from '@founders-coffee/core';

import {
  organisationsApi,
  type OrganisationPage,
} from '../features/organisations/api';
import { OrganisationPublicPage } from '../features/organisations/components/OrganisationPublicPage';
import { organisationPageHead } from '../lib/seo-organisation';

const OrganisationRoute = () => {
  const { locale, markets } = Route.useRouteContext();
  const page = Route.useLoaderData();
  return (
    <OrganisationPublicPage locale={locale} page={page} markets={markets} />
  );
};

export const Route = createFileRoute('/$locale/o/$slug/')({
  component: OrganisationRoute,
  loader: async ({ params }): Promise<OrganisationPage> => {
    try {
      return await organisationsApi.page(params.slug);
    } catch (error) {
      const code = appErrorCode(error);
      if (code === 'organisation_not_found' || code === 'validation_failed')
        throw notFound();
      throw error;
    }
  },
  head: ({ loaderData, match }) =>
    loaderData
      ? organisationPageHead({
          locale: match.context.locale,
          name: loaderData.organisation.name,
          description: loaderData.organisation.description,
          websiteUrl: loaderData.organisation.websiteUrl,
          marketCode: loaderData.organisation.marketCode,
          route: {
            type: 'organisation',
            slug: loaderData.organisation.slug,
            locale: match.context.locale,
          },
        })
      : { meta: [], links: [] },
});
