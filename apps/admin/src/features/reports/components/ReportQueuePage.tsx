import { useState } from 'react';

import { appErrorCode } from '@founders-coffee/core';
import {
  admin_hkn_decision_failed,
  admin_org_next,
  admin_org_previous,
  admin_rpt_dismissed,
  admin_rpt_disqualified,
  admin_rpt_empty,
  admin_rpt_heading,
  admin_rpt_stale,
  admin_rpt_unavailable,
  loading,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import { AdminPage } from '../../../components/AdminPage';
import { QueuePager } from '../../../components/QueuePager';
import { ReviewQueue } from '../../../components/ReviewQueue';
import type { ReportDecisionDraft } from '../decisions';
import { useDecideReport, useReportQueue } from '../hooks';
import type { ReportReviewSearch } from '../search';
import { ReportCard } from './ReportCard';

type Notice = 'dismissed' | 'disqualified' | 'stale' | 'failed';

const NOTICES = {
  dismissed: ['success', admin_rpt_dismissed],
  disqualified: ['success', admin_rpt_disqualified],
  stale: ['warning', admin_rpt_stale],
  failed: ['error', admin_hkn_decision_failed],
} as const;

const STALE_CODES = new Set(['report_decided', 'report_not_found']);

export const ReportQueuePage = ({
  locale,
  search,
  onSearch,
}: {
  locale: Locale;
  search: ReportReviewSearch;
  onSearch: (next: ReportReviewSearch) => void;
}) => {
  const queue = useReportQueue(search.page);
  const decide = useDecideReport();
  const [notice, setNotice] = useState<Notice | null>(null);
  const items = queue.data?.items ?? [];

  const onDecide = (draft: ReportDecisionDraft) => {
    setNotice(null);
    decide.mutate(draft, {
      onSuccess: (decided) =>
        setNotice(
          decided.decision === 'disqualify' ? 'disqualified' : 'dismissed',
        ),
      onError: (error) =>
        setNotice(
          STALE_CODES.has(appErrorCode(error) ?? '') ? 'stale' : 'failed',
        ),
    });
  };

  const shown = notice ? NOTICES[notice] : null;
  const keyOf = (item: { targetType: string; targetId: string }) =>
    `${item.targetType}:${item.targetId}`;

  return (
    <AdminPage heading={admin_rpt_heading({}, { locale })} locale={locale}>
      <ReviewQueue
        emptyLabel={admin_rpt_empty({}, { locale })}
        errorLabel={admin_rpt_unavailable({}, { locale })}
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
          <ReportCard
            isDeciding={
              decide.isPending && keyOf(decide.variables) === keyOf(item)
            }
            item={item}
            key={keyOf(item)}
            locale={locale}
            onDecide={onDecide}
          />
        ))}
      </ReviewQueue>
    </AdminPage>
  );
};
