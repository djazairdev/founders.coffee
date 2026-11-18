import { useId, useState } from 'react';

import {
  admin_cohost_add,
  admin_cohost_add_label,
  admin_cohost_no_candidates,
  type Locale,
} from '@founders-coffee/i18n';

import type { EventCoHosts } from '../api';

export const AddCoHostForm = ({
  locale,
  candidates,
  isChanging,
  onAdd,
}: {
  locale: Locale;
  candidates: EventCoHosts['candidates'];
  isChanging: boolean;
  onAdd: (organisationId: string) => void;
}) => {
  const id = useId();
  const [chosen, setChosen] = useState('');
  const organisationId = candidates.some(
    (candidate) => candidate.organisationId === chosen,
  )
    ? chosen
    : (candidates[0]?.organisationId ?? '');

  if (candidates.length === 0)
    return (
      <p className="border-t border-base-300 pt-4 text-body-sm text-neutral">
        {admin_cohost_no_candidates({}, { locale })}
      </p>
    );

  return (
    <form
      className="space-y-2 border-t border-base-300 pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (organisationId) onAdd(organisationId);
      }}
    >
      <label className="block text-label" htmlFor={`${id}-organisation`}>
        {admin_cohost_add_label({}, { locale })}
      </label>
      <div className="flex flex-wrap gap-2">
        <select
          className="select select-sm md:select-md min-w-0 flex-1"
          id={`${id}-organisation`}
          onChange={(event) => setChosen(event.target.value)}
          value={organisationId}
        >
          {candidates.map((candidate) => (
            <option
              key={candidate.organisationId}
              value={candidate.organisationId}
            >
              {candidate.name}
            </option>
          ))}
        </select>
        <button
          className="btn btn-primary btn-xs sm:btn-sm md:btn-md"
          disabled={isChanging}
          type="submit"
        >
          {admin_cohost_add({}, { locale })}
        </button>
      </div>
    </form>
  );
};
