import { useState } from 'react';

import { appErrorCode, type OrganisationStatus } from '@founders-coffee/core';
import {
  admin_org_decided,
  admin_org_decision_failed,
  admin_org_empty,
  admin_org_heading,
  admin_org_next,
  admin_org_previous,
  admin_org_stale,
  admin_org_status_approved,
  admin_org_status_label,
  admin_org_status_pending,
  admin_org_status_rejected,
  admin_org_status_suspended,
  admin_org_unavailable,
  loading,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import { AdminPage } from '../../../components/AdminPage';
import { QueueFilter } from '../../../components/QueueFilter';
import { QueuePager } from '../../../components/QueuePager';
import { ReviewQueue } from '../../../components/ReviewQueue';
import type { OrganisationDecision } from '../decisions';
import { useDecideOrganisation, useOrganisationReviewQueue } from '../hooks';
import type { OrganisationReviewSearch } from '../search';
import { OrganisationReviewCard } from './OrganisationReviewCard';

const STATUSES: readonly [OrganisationStatus, typeof admin_org_heading][] = [
  ['pending', admin_org_status_pending],
  ['approved', admin_org_status_approved],
  ['suspended', admin_org_status_suspended],
  ['rejected', admin_org_status_rejected],
];

type Notice = 'decided' | 'stale' | 'failed';

export const OrganisationReviewPage = ({
  locale,
  search,
  onSearch,
}: {
  locale: Locale;
  search: OrganisationReviewSearch;
  onSearch: (next: OrganisationReviewSearch) => void;
}) => {
  const queue = useOrganisationReviewQueue(search.status, search.page);
  const decide = useDecideOrganisation();
  const [notice, setNotice] = useState<Notice | null>(null);
  const items = queue.data?.items ?? [];

  const onDecide =
    (organisationId: string) =>
    (decision: OrganisationDecision, note: string) => {
      setNotice(null);
      decide.mutate(
        { organisationId, decision, note },
        {
          onSuccess: () => setNotice('decided'),
          onError: (error) =>
            setNotice(
              appErrorCode(error) === 'invalid_organisation_transition'
                ? 'stale'
                : 'failed',
            ),
        },
      );
    };

  const noticeMessage =
    notice === 'decided' ? (
      <StatusMessage variant="success">
        {admin_org_decided({}, { locale })}
      </StatusMessage>
    ) : notice === 'stale' ? (
      <StatusMessage variant="warning">
        {admin_org_stale({}, { locale })}
      </StatusMessage>
    ) : notice === 'failed' ? (
      <StatusMessage variant="error">
        {admin_org_decision_failed({}, { locale })}
      </StatusMessage>
    ) : null;

  return (
    <AdminPage heading={admin_org_heading({}, { locale })} locale={locale}>
      <ReviewQueue
        emptyLabel={admin_org_empty({}, { locale })}
        errorLabel={admin_org_unavailable({}, { locale })}
        filter={
          <QueueFilter
            active={search.status}
            label={admin_org_status_label({}, { locale })}
            onSelect={(status) => {
              setNotice(null);
              onSearch({ status, page: 0 });
            }}
            options={STATUSES.map(([value, label]) => ({
              value,
              label: label({}, { locale }),
            }))}
          />
        }
        isEmpty={items.length === 0}
        isError={queue.isError}
        isLoading={queue.isPending}
        loadingLabel={loading({}, { locale })}
        notice={noticeMessage}
        pager={
          <QueuePager
            hasMore={queue.data?.hasMore ?? false}
            nextLabel={admin_org_next({}, { locale })}
            onPage={(page) => onSearch({ status: search.status, page })}
            page={search.page}
            previousLabel={admin_org_previous({}, { locale })}
          />
        }
      >
        {items.map((item) => (
          <OrganisationReviewCard
            isDeciding={
              decide.isPending && decide.variables.organisationId === item.id
            }
            item={item}
            key={item.id}
            locale={locale}
            onDecide={onDecide(item.id)}
          />
        ))}
      </ReviewQueue>
    </AdminPage>
  );
};
