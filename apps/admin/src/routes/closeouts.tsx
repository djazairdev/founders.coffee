import { createFileRoute } from '@tanstack/react-router';

import { MissingCloseoutsPage } from '../features/closeouts/components/MissingCloseoutsPage';

const MissingCloseoutsRoute = () => {
  const { locale } = Route.useRouteContext();
  return <MissingCloseoutsPage locale={locale} />;
};

export const Route = createFileRoute('/closeouts')({
  component: MissingCloseoutsRoute,
});
