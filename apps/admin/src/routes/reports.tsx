import { createFileRoute } from '@tanstack/react-router';

import { ReportQueuePage } from '../features/reports/components/ReportQueuePage';
import { readReportReviewSearch } from '../features/reports/search';

const ReportsRoute = () => {
  const { locale } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ReportQueuePage
      locale={locale}
      onSearch={(next) => void navigate({ search: next })}
      search={search}
    />
  );
};

export const Route = createFileRoute('/reports')({
  validateSearch: readReportReviewSearch,
  component: ReportsRoute,
});
