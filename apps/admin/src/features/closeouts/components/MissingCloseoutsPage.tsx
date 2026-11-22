import { useState } from 'react';

import { appErrorCode } from '@founders-coffee/core';
import {
  admin_closeout_empty,
  admin_closeout_failed,
  admin_closeout_heading,
  admin_closeout_not_eligible,
  admin_closeout_saved,
  admin_closeout_stale,
  admin_closeout_unavailable,
  loading,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import { AdminPage } from '../../../components/AdminPage';
import { ReviewQueue } from '../../../components/ReviewQueue';
import { useCreateMissingCloseout, useMissingCloseouts } from '../hooks';
import { MissingCloseoutCard } from './MissingCloseoutCard';

type Notice = 'saved' | 'stale' | 'not-eligible' | 'failed';

const NOTICE_LABELS = {
  saved: ['success', admin_closeout_saved],
  stale: ['warning', admin_closeout_stale],
  'not-eligible': ['error', admin_closeout_not_eligible],
  failed: ['error', admin_closeout_failed],
} as const;

export const MissingCloseoutsPage = ({ locale }: { locale: Locale }) => {
  const queue = useMissingCloseouts();
  const create = useCreateMissingCloseout();
  const [notice, setNotice] = useState<Notice | null>(null);
  const shown = notice ? NOTICE_LABELS[notice] : null;
  const eventId = create.variables?.eventId;

  return (
    <AdminPage heading={admin_closeout_heading({}, { locale })} locale={locale}>
      <ReviewQueue
        emptyLabel={admin_closeout_empty({}, { locale })}
        errorLabel={admin_closeout_unavailable({}, { locale })}
        filter={null}
        isEmpty={(queue.data?.items.length ?? 0) === 0}
        isError={queue.isError}
        isLoading={queue.isPending}
        loadingLabel={loading({}, { locale })}
        notice={
          shown ? (
            <StatusMessage variant={shown[0]}>
              {shown[1]({}, { locale })}
            </StatusMessage>
          ) : null
        }
      >
        {(queue.data?.items ?? []).map((item) => (
          <MissingCloseoutCard
            canCreate={queue.data?.canCreate ?? false}
            isSaving={create.isPending && eventId === item.eventId}
            item={item}
            key={item.eventId}
            locale={locale}
            onCreate={(request) => {
              setNotice(null);
              create.mutate(request, {
                onSuccess: () => setNotice('saved'),
                onError: (error) => {
                  const code = appErrorCode(error);
                  setNotice(
                    code === 'closeout_already_closed'
                      ? 'stale'
                      : code === 'closeout_not_eligible'
                        ? 'not-eligible'
                        : 'failed',
                  );
                },
              });
            }}
          />
        ))}
      </ReviewQueue>
    </AdminPage>
  );
};
