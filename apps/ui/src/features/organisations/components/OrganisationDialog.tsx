import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

import { cancel, type Locale } from '@founders-coffee/i18n';

export const OrganisationDialog = ({
  children,
  isOpen,
  locale,
  onRequestClose,
  title,
}: {
  children: ReactNode;
  isOpen: boolean;
  locale: Locale;
  onRequestClose: () => void;
  title: string;
}) => {
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
      onClose={onRequestClose}
      onCancel={(event) => {
        event.preventDefault();
        onRequestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onRequestClose();
      }}
    >
      <div className="modal-box max-h-[90dvh] max-w-2xl overflow-y-auto rounded-box border border-base-300 bg-base-100">
        <header className="mb-5 flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-h4 font-semibold">
            {title}
          </h2>
          <button
            type="button"
            className="btn btn-ghost btn-square btn-xs sm:btn-sm md:btn-md"
            aria-label={cancel({}, { locale })}
            onClick={onRequestClose}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
};
