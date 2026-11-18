import { useId, useState } from 'react';

import {
  admin_cohost_find,
  admin_cohost_reference_hint,
  admin_cohost_reference_label,
  type Locale,
} from '@founders-coffee/i18n';

export const EventReferenceForm = ({
  locale,
  initial,
  onFind,
}: {
  locale: Locale;
  initial: string;
  onFind: (reference: string) => void;
}) => {
  const id = useId();
  const [reference, setReference] = useState(initial);

  return (
    <form
      className="mb-6 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (reference.trim()) onFind(reference.trim());
      }}
    >
      <label className="block text-label" htmlFor={`${id}-reference`}>
        {admin_cohost_reference_label({}, { locale })}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          aria-describedby={`${id}-hint`}
          className="input input-sm md:input-md min-w-0 flex-1"
          dir="ltr"
          id={`${id}-reference`}
          maxLength={500}
          onChange={(event) => setReference(event.target.value)}
          type="text"
          value={reference}
        />
        <button
          className="btn btn-primary btn-xs sm:btn-sm md:btn-md"
          type="submit"
        >
          {admin_cohost_find({}, { locale })}
        </button>
      </div>
      <p className="text-caption text-neutral" id={`${id}-hint`}>
        {admin_cohost_reference_hint({}, { locale })}
      </p>
    </form>
  );
};
