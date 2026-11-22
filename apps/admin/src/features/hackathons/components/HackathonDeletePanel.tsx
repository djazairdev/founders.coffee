import { useState } from 'react';

import {
  admin_hkn_delete_search,
  admin_hkn_delete_search_empty,
  admin_hkn_delete_search_hint,
  admin_hkn_delete_search_label,
  admin_hkn_delete_searching,
  admin_hkn_delete_title,
  admin_hkn_market,
  hackathon_delete_action,
  hackathon_delete_cancel,
  hackathon_delete_confirm_body,
  hackathon_delete_confirm_title,
  hackathon_delete_failed,
  hackathon_delete_success,
  type Locale,
} from '@founders-coffee/i18n';
import type { EventStatus } from '@founders-coffee/core';
import {
  org_hackathon_status_cancelled,
  org_hackathon_status_deleted,
  org_hackathon_status_draft,
  org_hackathon_status_published,
} from '@founders-coffee/i18n';
import {
  Button,
  ConfirmDialog,
  Input,
  StatusMessage,
} from '@founders-coffee/ui';

import type { HackathonDeletionCandidate } from '../api';
import { useDeleteAnyHackathon, useHackathonsForDeletion } from '../hooks';

const statusLabel = (status: EventStatus, locale: Locale): string => {
  const options = { locale };
  switch (status) {
    case 'draft':
      return org_hackathon_status_draft({}, options);
    case 'published':
      return org_hackathon_status_published({}, options);
    case 'cancelled':
      return org_hackathon_status_cancelled({}, options);
    case 'deleted':
      return org_hackathon_status_deleted({}, options);
  }
};

export const HackathonDeletePanel = ({ locale }: { locale: Locale }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<HackathonDeletionCandidate | null>(
    null,
  );
  const [notice, setNotice] = useState<'success' | 'failed' | null>(null);
  const results = useHackathonsForDeletion(query.trim());
  const deletion = useDeleteAnyHackathon();

  const confirm = () => {
    if (!selected) return;
    setNotice(null);
    deletion.mutate(selected.eventId, {
      onSuccess: () => {
        setSelected(null);
        setNotice('success');
      },
      onError: () => setNotice('failed'),
    });
  };

  return (
    <section className="mb-8 rounded-box border border-base-300 bg-base-100 p-4 sm:p-6">
      <h2 className="font-display text-h4 font-semibold">
        {admin_hkn_delete_title({}, { locale })}
      </h2>
      <p className="mt-2 text-body-sm text-neutral">
        {admin_hkn_delete_search_hint({}, { locale })}
      </p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void results.refetch();
        }}
      >
        <label className="flex-1">
          <span className="mb-1 block text-label text-neutral">
            {admin_hkn_delete_search_label({}, { locale })}
          </span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            minLength={2}
          />
        </label>
        <Button
          className="self-end"
          variant="secondary"
          type="submit"
          disabled={query.trim().length < 2 || results.isFetching}
        >
          {results.isFetching
            ? admin_hkn_delete_searching({}, { locale })
            : admin_hkn_delete_search({}, { locale })}
        </Button>
      </form>
      {notice === 'success' ? (
        <StatusMessage variant="success" className="mt-4">
          {hackathon_delete_success({}, { locale })}
        </StatusMessage>
      ) : null}
      {notice === 'failed' || results.isError ? (
        <StatusMessage variant="error" className="mt-4">
          {hackathon_delete_failed({}, { locale })}
        </StatusMessage>
      ) : null}
      {query.trim().length >= 2 && results.isSuccess ? (
        results.data.length ? (
          <ul className="mt-4 divide-y divide-base-300">
            {results.data.map((item) => (
              <li
                key={item.eventId}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words font-semibold">{item.title}</p>
                  <p className="text-caption text-neutral">
                    {item.organisationName ? `${item.organisationName} · ` : ''}
                    {admin_hkn_market({}, { locale })}: {item.marketCode} ·{' '}
                    {statusLabel(item.status, locale)} · {item.eventId}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="btn-error shrink-0"
                  onClick={() => setSelected(item)}
                >
                  {hackathon_delete_action({}, { locale })}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-body-sm text-neutral">
            {admin_hkn_delete_search_empty({}, { locale })}
          </p>
        )
      ) : null}
      <ConfirmDialog
        isOpen={selected !== null}
        title={hackathon_delete_confirm_title(
          { title: selected?.title ?? '' },
          { locale },
        )}
        description={hackathon_delete_confirm_body({}, { locale })}
        confirmLabel={hackathon_delete_action({}, { locale })}
        cancelLabel={hackathon_delete_cancel({}, { locale })}
        isPending={deletion.isPending}
        onCancel={() => setSelected(null)}
        onConfirm={confirm}
      />
    </section>
  );
};
