import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

import { title } from '@founders-coffee/i18n';

import { AdminPage } from '../components/AdminPage';
import { OperationsNav } from '../features/shell/OperationsNav';
import { getOperatorStatus } from '../features/status/api';
import { OperatorStatus } from '../features/status/OperatorStatus';

const Operations = () => {
  const { locale } = Route.useRouteContext();
  const status = useQuery({
    queryKey: ['operator-status'],
    queryFn: () => getOperatorStatus(),
    retry: false,
  });

  return (
    <AdminPage heading={title({}, { locale })} isHome locale={locale}>
      <OperationsNav locale={locale} />
      <OperatorStatus
        locale={locale}
        status={status.data}
        isError={status.isError}
      />
    </AdminPage>
  );
};

export const Route = createFileRoute('/')({ component: Operations });
