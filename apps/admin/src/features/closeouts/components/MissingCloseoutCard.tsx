import { useState } from 'react';

import type { CreateMissingCloseoutRequest } from '@founders-coffee/server-fns/admin';
import {
  admin_closeout_did_not_happen,
  admin_closeout_did_not_happen_notice,
  admin_closeout_ended,
  admin_closeout_held,
  admin_closeout_note,
  admin_closeout_outcome,
  admin_closeout_save,
  formatDate,
  type Locale,
} from '@founders-coffee/i18n';

import type { MissingCloseoutItem } from '../api';

export const MissingCloseoutCard = ({
  item,
  locale,
  canCreate,
  isSaving,
  onCreate,
}: {
  item: MissingCloseoutItem;
  locale: Locale;
  canCreate: boolean;
  isSaving: boolean;
  onCreate: (request: CreateMissingCloseoutRequest) => void;
}) => {
  const [outcome, setOutcome] =
    useState<CreateMissingCloseoutRequest['outcome']>('held');
  const fieldId = `closeout-outcome-${item.eventId}`;
  return (
    <li className="space-y-3 rounded-box border border-base-300 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="min-w-0 break-words text-h4 font-medium">
          <bdi>{item.title}</bdi>
        </h2>
        <span className="badge badge-ghost">
          <bdi>{item.marketCode}</bdi>
        </span>
      </div>
      <p className="text-body-sm text-neutral">
        {admin_closeout_ended(
          {
            date: formatDate(item.endsAt, locale, {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: item.timeZone,
            }),
          },
          { locale },
        )}
      </p>
      <p className="text-body-sm text-neutral">
        {admin_closeout_note({}, { locale })}
      </p>
      {canCreate ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate({ eventId: item.eventId, outcome });
          }}
        >
          <div className="flex max-w-sm flex-col gap-1">
            <label className="text-body-sm" htmlFor={fieldId}>
              {admin_closeout_outcome({}, { locale })}
            </label>
            <select
              className="select select-sm md:select-md"
              id={fieldId}
              onChange={(event) =>
                setOutcome(
                  event.target.value as CreateMissingCloseoutRequest['outcome'],
                )
              }
              value={outcome}
            >
              <option value="held">
                {admin_closeout_held({}, { locale })}
              </option>
              <option value="did_not_happen">
                {admin_closeout_did_not_happen({}, { locale })}
              </option>
            </select>
          </div>
          {outcome === 'did_not_happen' ? (
            <p className="text-body-sm text-neutral">
              {admin_closeout_did_not_happen_notice({}, { locale })}
            </p>
          ) : null}
          <button
            className="btn btn-primary btn-xs sm:btn-sm md:btn-md"
            disabled={isSaving}
            type="submit"
          >
            {admin_closeout_save({}, { locale })}
          </button>
        </form>
      ) : null}
    </li>
  );
};
