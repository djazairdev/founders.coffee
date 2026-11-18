import { useEffect, useId, useRef } from 'react';

import {
  org_member_remove,
  org_member_remove_body,
  org_member_remove_keep,
  org_member_remove_title,
  type Locale,
} from '@founders-coffee/i18n';
import { IsolatedValue } from '@founders-coffee/ui';

export const RemoveMemberDialog = ({
  name,
  locale,
  isPending,
  onKeep,
  onConfirm,
}: {
  name: string | null;
  locale: Locale;
  isPending: boolean;
  onKeep: () => void;
  onConfirm: () => void;
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isOpen = name !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onClose={onKeep}
    >
      <div className="modal-box max-w-sm rounded-box border border-base-300 bg-base-100">
        <h2 id={titleId} className="font-display text-h4 font-semibold">
          {org_member_remove_title({}, { locale })}
        </h2>
        <p className="mt-2 text-body-sm leading-relaxed text-neutral">
          <IsolatedValue
            value={name ?? ''}
            message={(member) =>
              org_member_remove_body({ name: member }, { locale })
            }
          />
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn btn-ghost btn-xs sm:btn-sm md:btn-md"
            onClick={onKeep}
          >
            {org_member_remove_keep({}, { locale })}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-error btn-xs sm:btn-sm md:btn-md"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <span
                className="loading loading-spinner loading-xs"
                aria-hidden="true"
              />
            ) : null}
            {org_member_remove({}, { locale })}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" tabIndex={-1} aria-hidden="true">
          {org_member_remove_keep({}, { locale })}
        </button>
      </form>
    </dialog>
  );
};
