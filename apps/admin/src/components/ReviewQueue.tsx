import type { ReactNode } from 'react';

import { LoadingStatus, StatusMessage } from '@founders-coffee/ui';

export const ReviewQueue = ({
  filter,
  notice,
  pager,
  isLoading,
  isError,
  isEmpty,
  loadingLabel,
  errorLabel,
  emptyLabel,
  children,
}: {
  filter: ReactNode;
  notice?: ReactNode;
  pager?: ReactNode;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  loadingLabel: string;
  errorLabel: string;
  emptyLabel: string;
  children: ReactNode;
}) => {
  const body = isError ? (
    <StatusMessage variant="error">{errorLabel}</StatusMessage>
  ) : isLoading ? (
    <LoadingStatus label={loadingLabel} />
  ) : isEmpty ? (
    <StatusMessage variant="info">{emptyLabel}</StatusMessage>
  ) : (
    <ul className="space-y-4">{children}</ul>
  );
  return (
    <div className="space-y-4">
      {filter}
      {notice}
      {body}
      {pager}
    </div>
  );
};
