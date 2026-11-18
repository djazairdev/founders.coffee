import { createFileRoute } from '@tanstack/react-router';

import { HackathonReviewPage } from '../features/hackathons/components/HackathonReviewPage';
import { readHackathonReviewSearch } from '../features/hackathons/search';

const HackathonsRoute = () => {
  const { locale } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <HackathonReviewPage
      locale={locale}
      onSearch={(next) => void navigate({ search: next })}
      search={search}
    />
  );
};

export const Route = createFileRoute('/hackathons')({
  validateSearch: readHackathonReviewSearch,
  component: HackathonsRoute,
});
