import { createFileRoute } from '@tanstack/react-router';

import { hackathon_certificate_heading } from '@founders-coffee/i18n';

import { certificatesApi } from '../features/hackathons/api';
import { HackathonCertificatePage } from '../features/hackathons/components/HackathonCertificatePage';
import { NO_INDEX_VALUE } from '../lib/indexation';
import { buildPageTitle } from '../lib/seo';

const CertificateRoute = () => {
  const { locale } = Route.useRouteContext();
  const certificate = Route.useLoaderData();
  return <HackathonCertificatePage certificate={certificate} locale={locale} />;
};

export const Route = createFileRoute('/$locale/c/$code')({
  component: CertificateRoute,
  loader: ({ params }) => certificatesApi.page(params.code),
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': NO_INDEX_VALUE,
  }),
  staleTime: 0,
  gcTime: 0,
  head: ({ match }) => ({
    meta: [
      {
        title: buildPageTitle(
          hackathon_certificate_heading({}, { locale: match.context.locale }),
        ),
      },
      { name: 'robots', content: NO_INDEX_VALUE },
    ],
  }),
});
