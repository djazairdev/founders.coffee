import { useId, useRef, useState } from 'react';

import {
  admin_hkn_approve,
  admin_hkn_note_hint,
  admin_hkn_note_label,
  admin_hkn_note_needed,
  admin_hkn_reject,
  type Locale,
} from '@founders-coffee/i18n';

import {
  decisionRequest,
  HACKATHON_DECISIONS,
  REJECTION_NOTE_MIN_LENGTH,
  REVIEW_NOTE_MAX_LENGTH,
  type HackathonDecision,
} from '../decisions';

const LABELS: Record<HackathonDecision, typeof admin_hkn_approve> = {
  approve: admin_hkn_approve,
  reject: admin_hkn_reject,
};

const STYLES: Record<HackathonDecision, string> = {
  approve: 'btn btn-primary btn-xs sm:btn-sm md:btn-md',
  reject: 'btn btn-error btn-outline btn-xs sm:btn-sm md:btn-md',
};

export const HackathonDecisionForm = ({
  locale,
  eventId,
  isDeciding,
  onDecide,
}: {
  locale: Locale;
  eventId: string;
  isDeciding: boolean;
  onDecide: (decision: HackathonDecision, note: string) => void;
}) => {
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const [note, setNote] = useState('');
  const [isNoteMissing, setIsNoteMissing] = useState(false);

  const choose = (decision: HackathonDecision) => {
    if (!decisionRequest(eventId, decision, note)) {
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
        {admin_hkn_note_label({}, { locale })}
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
          if (
            isNoteMissing &&
            decisionRequest(eventId, 'reject', event.target.value)
          )
            setIsNoteMissing(false);
        }}
        ref={field}
        rows={3}
        value={note}
      />
      {isNoteMissing ? (
        <p className="text-caption text-error" id={`${id}-missing`}>
          {admin_hkn_note_needed(
            { min: String(REJECTION_NOTE_MIN_LENGTH) },
            { locale },
          )}
        </p>
      ) : (
        <p className="text-caption text-neutral" id={`${id}-hint`}>
          {admin_hkn_note_hint({}, { locale })}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {HACKATHON_DECISIONS.map((decision) => (
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
