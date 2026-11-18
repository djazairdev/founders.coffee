import { useEffect, useId, useRef } from 'react';

import {
  hackathon_results_panel_confirm_body,
  hackathon_results_panel_confirm_keep,
  hackathon_results_panel_confirm_ties,
  hackathon_results_panel_confirm_title,
  hackathon_results_panel_publish,
  type Locale,
} from '@founders-coffee/i18n';

export const HackathonResultsConfirmDialog = ({
  isOpen,
  hasTies,
  locale,
  onKeep,
  onConfirm,
}: {
  isOpen: boolean;
  hasTies: boolean;
  locale: Locale;
  onKeep: () => void;
  onConfirm: () => void;
}) => {
  const options = { locale };
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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
          {hackathon_results_panel_confirm_title({}, options)}
        </h2>
        <p className="mt-2 text-body-sm leading-relaxed text-neutral">
          {hackathon_results_panel_confirm_body({}, options)}
          {hasTies ? (
            <> {hackathon_results_panel_confirm_ties({}, options)}</>
          ) : null}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn btn-ghost btn-xs sm:btn-sm md:btn-md"
            onClick={onKeep}
          >
            {hackathon_results_panel_confirm_keep({}, options)}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-xs sm:btn-sm md:btn-md"
            onClick={onConfirm}
          >
            {hackathon_results_panel_publish({}, options)}
          </button>
        </div>
      </div>
    </dialog>
  );
};
