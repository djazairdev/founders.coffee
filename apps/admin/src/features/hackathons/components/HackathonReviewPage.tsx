import { useState } from 'react';

import { appErrorCode } from '@founders-coffee/core';
import {
  admin_hkn_decided,
  admin_hkn_decision_failed,
  admin_hkn_empty,
  admin_hkn_heading,
  admin_hkn_stale,
  admin_hkn_unavailable,
  admin_org_next,
  admin_org_previous,
  loading,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import { AdminPage } from '../../../components/AdminPage';
import { QueuePager } from '../../../components/QueuePager';
import { ReviewQueue } from '../../../components/ReviewQueue';
import type { HackathonDecision } from '../decisions';
import { useDecideHackathon, useHackathonReviewQueue } from '../hooks';
import type { HackathonReviewSearch } from '../search';
import { HackathonReviewCard } from './HackathonReviewCard';

type Notice = 'decided' | 'stale' | 'failed';

const NOTICES = {
  decided: ['success', admin_hkn_decided],
  stale: ['warning', admin_hkn_stale],
  failed: ['error', admin_hkn_decision_failed],
} as const;

export const HackathonReviewPage = ({
  locale,
  search,
  onSearch,
}: {
  locale: Locale;
  search: HackathonReviewSearch;
  onSearch: (next: HackathonReviewSearch) => void;
}) => {
  const queue = useHackathonReviewQueue(search.page);
  const decide = useDecideHackathon();
  const [notice, setNotice] = useState<Notice | null>(null);
  const items = queue.data?.items ?? [];

  const onDecide =
    (eventId: string) => (decision: HackathonDecision, note: string) => {
      setNotice(null);
      decide.mutate(
        { eventId, decision, note },
        {
          onSuccess: () => setNotice('decided'),
          onError: (error) =>
            setNotice(
              appErrorCode(error) === 'invalid_hackathon_transition'
                ? 'stale'
                : 'failed',
            ),
        },
      );
    };

  const shown = notice ? NOTICES[notice] : null;

  return (
    <AdminPage heading={admin_hkn_heading({}, { locale })} locale={locale}>
      <ReviewQueue
        emptyLabel={admin_hkn_empty({}, { locale })}
        errorLabel={admin_hkn_unavailable({}, { locale })}
        filter={null}
        isEmpty={items.length === 0}
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
        pager={
          <QueuePager
            hasMore={queue.data?.hasMore ?? false}
            nextLabel={admin_org_next({}, { locale })}
            onPage={(page) => onSearch({ page })}
            page={search.page}
            previousLabel={admin_org_previous({}, { locale })}
          />
        }
      >
        {items.map((item) => (
          <HackathonReviewCard
            isDeciding={
              decide.isPending && decide.variables.eventId === item.eventId
            }
            item={item}
            key={item.eventId}
            locale={locale}
            onDecide={onDecide(item.eventId)}
          />
        ))}
      </ReviewQueue>
    </AdminPage>
  );
};
