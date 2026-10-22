import { useState } from 'react';

import {
  admin_cohost_added,
  admin_cohost_already,
  admin_cohost_failed,
  admin_cohost_heading,
  admin_cohost_not_approved,
  admin_cohost_not_found,
  admin_cohost_removed,
  admin_cohost_unavailable,
  loading,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import { AdminPage } from '../../../components/AdminPage';
import { useChangeCoHost, useEventCoHosts } from '../hooks';
import { isEventNotFound, refusalNotice, type CoHostNotice } from '../notices';
import type { EventCoHostSearch } from '../search';
import { EventCoHostCard } from './EventCoHostCard';
import { EventReferenceForm } from './EventReferenceForm';

const NOTICES: Record<
  CoHostNotice,
  readonly ['success' | 'warning' | 'error', typeof admin_cohost_added]
> = {
  added: ['success', admin_cohost_added],
  removed: ['success', admin_cohost_removed],
  already: ['warning', admin_cohost_already],
  not_approved: ['warning', admin_cohost_not_approved],
  failed: ['error', admin_cohost_failed],
};

export const EventCoHostsPage = ({
  locale,
  search,
  onSearch,
}: {
  locale: Locale;
  search: EventCoHostSearch;
  onSearch: (next: EventCoHostSearch) => void;
}) => {
  const reference = search.event ?? null;
  const coHosts = useEventCoHosts(reference);
  const change = useChangeCoHost(reference);
  const [notice, setNotice] = useState<CoHostNotice | null>(null);

  const changeCoHost = (kind: 'add' | 'remove') => (organisationId: string) => {
    const eventId = coHosts.data?.event.id;
    if (!eventId) return;
    setNotice(null);
    change.mutate(
      { change: kind, request: { eventId, organisationId } },
      {
        onSuccess: () => setNotice(kind === 'add' ? 'added' : 'removed'),
        onError: (error) => setNotice(refusalNotice(error)),
      },
    );
  };

  const shown = notice ? NOTICES[notice] : null;

  return (
    <AdminPage heading={admin_cohost_heading({}, { locale })} locale={locale}>
      <EventReferenceForm
        initial={reference ?? ''}
        key={reference ?? ''}
        locale={locale}
        onFind={(event) => {
          setNotice(null);
          onSearch({ event });
        }}
      />
      {shown ? (
        <StatusMessage className="mb-4" variant={shown[0]}>
          {shown[1]({}, { locale })}
        </StatusMessage>
      ) : null}
      {reference === null ? null : coHosts.isPending ? (
        <p className="text-neutral">{loading({}, { locale })}</p>
      ) : coHosts.isError ? (
        <StatusMessage
          variant={isEventNotFound(coHosts.error) ? 'warning' : 'error'}
        >
          {isEventNotFound(coHosts.error)
            ? admin_cohost_not_found({}, { locale })
            : admin_cohost_unavailable({}, { locale })}
        </StatusMessage>
      ) : (
        <EventCoHostCard
          coHosts={coHosts.data}
          isChanging={change.isPending}
          locale={locale}
          onAdd={changeCoHost('add')}
          onRemove={changeCoHost('remove')}
        />
      )}
    </AdminPage>
  );
};
