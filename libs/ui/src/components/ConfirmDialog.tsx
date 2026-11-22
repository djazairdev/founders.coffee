import { useEffect, useId, useRef } from 'react';

import { Button } from './Button.js';

export type ConfirmDialogProps = {
  readonly isOpen: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly isPending?: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
};

export const ConfirmDialog = ({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  isPending = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

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
      aria-describedby={descriptionId}
      onClose={onCancel}
      onCancel={(event) => {
        if (isPending) event.preventDefault();
      }}
    >
      <div className="modal-box max-w-md rounded-box border border-base-300 bg-base-100">
        <h2 id={titleId} className="font-display text-h4 font-semibold">
          {title}
        </h2>
        <p
          id={descriptionId}
          className="mt-2 text-body-sm leading-relaxed text-neutral"
        >
          {description}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant="outline"
            className="btn-error"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <span
                className="loading loading-spinner loading-xs"
                aria-hidden="true"
              />
            ) : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button
          type="submit"
          tabIndex={-1}
          aria-hidden="true"
          disabled={isPending}
        >
          {cancelLabel}
        </button>
      </form>
    </dialog>
  );
};
