import { createFileRoute } from '@tanstack/react-router';

import { EventCoHostsPage } from '../features/events/components/EventCoHostsPage';
import { readEventCoHostSearch } from '../features/events/search';

const CoHostsRoute = () => {
  const { locale } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <EventCoHostsPage
      locale={locale}
      onSearch={(next) => void navigate({ search: next })}
      search={search}
    />
  );
};

export const Route = createFileRoute('/co-hosts')({
  validateSearch: readEventCoHostSearch,
  component: CoHostsRoute,
});
