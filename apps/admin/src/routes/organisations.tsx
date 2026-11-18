import { createFileRoute } from '@tanstack/react-router';

import { OrganisationReviewPage } from '../features/organisations/components/OrganisationReviewPage';
import { readOrganisationReviewSearch } from '../features/organisations/search';

const OrganisationsRoute = () => {
  const { locale } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <OrganisationReviewPage
      locale={locale}
      onSearch={(next) => void navigate({ search: next })}
      search={search}
    />
  );
};

export const Route = createFileRoute('/organisations')({
  validateSearch: readOrganisationReviewSearch,
  component: OrganisationsRoute,
});
