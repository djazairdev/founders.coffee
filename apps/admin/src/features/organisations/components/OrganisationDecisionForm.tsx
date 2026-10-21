import { useId, useRef, useState } from 'react';

import {
  admin_org_approve,
  admin_org_note_hint,
  admin_org_note_label,
  admin_org_note_needed,
  admin_org_reinstate,
  admin_org_reject,
  admin_org_suspend,
  type Locale,
} from '@founders-coffee/i18n';
import type { OrganisationStatus } from '@founders-coffee/core';

import {
  decisionRequest,
  decisionsFor,
  REJECTION_NOTE_MIN_LENGTH,
  REVIEW_NOTE_MAX_LENGTH,
  type OrganisationDecision,
} from '../decisions';

const LABELS: Record<OrganisationDecision, typeof admin_org_approve> = {
  approve: admin_org_approve,
  reject: admin_org_reject,
  suspend: admin_org_suspend,
  reinstate: admin_org_reinstate,
};

const STYLES: Record<OrganisationDecision, string> = {
  approve: 'btn btn-primary btn-xs sm:btn-sm md:btn-md',
  reject: 'btn btn-error btn-outline btn-xs sm:btn-sm md:btn-md',
  suspend: 'btn btn-warning btn-outline btn-xs sm:btn-sm md:btn-md',
  reinstate: 'btn btn-primary btn-xs sm:btn-sm md:btn-md',
};

export const OrganisationDecisionForm = ({
  locale,
  status,
  isDeciding,
  onDecide,
}: {
  locale: Locale;
  status: OrganisationStatus;
  isDeciding: boolean;
  onDecide: (decision: OrganisationDecision, note: string) => void;
}) => {
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const [note, setNote] = useState('');
  const [isNoteMissing, setIsNoteMissing] = useState(false);
  const decisions = decisionsFor(status);
  if (decisions.length === 0) return null;

  const choose = (decision: OrganisationDecision) => {
    if (!decisionRequest(decision, note)) {
      setIsNoteMissing(true);
      field.current?.focus();
      return;
    }
    setIsNoteMissing(false);
    onDecide(decision, note);
  };

  return (
    <div className="space-y-2 border-t border-base-300 pt-4">
      <label className="block text-label" htmlFor={`${id}-note`}>
        {admin_org_note_label({}, { locale })}
      </label>
      <textarea
        aria-describedby={isNoteMissing ? `${id}-missing` : `${id}-hint`}
        aria-invalid={isNoteMissing || undefined}
        className="textarea textarea-sm md:textarea-md w-full"
        dir="auto"
        id={`${id}-note`}
        maxLength={REVIEW_NOTE_MAX_LENGTH}
        onChange={(event) => {
          setNote(event.target.value);
          if (isNoteMissing && decisionRequest('reject', event.target.value))
            setIsNoteMissing(false);
        }}
        ref={field}
        rows={3}
        value={note}
      />
      {isNoteMissing ? (
        <p className="text-caption text-error" id={`${id}-missing`}>
          {admin_org_note_needed(
            { min: String(REJECTION_NOTE_MIN_LENGTH) },
            { locale },
          )}
        </p>
      ) : (
        <p className="text-caption text-neutral" id={`${id}-hint`}>
          {admin_org_note_hint({}, { locale })}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {decisions.map((decision) => (
          <button
            className={STYLES[decision]}
            disabled={isDeciding}
            key={decision}
            onClick={() => choose(decision)}
            type="button"
          >
            {LABELS[decision]({}, { locale })}
          </button>
        ))}
      </div>
    </div>
  );
};
