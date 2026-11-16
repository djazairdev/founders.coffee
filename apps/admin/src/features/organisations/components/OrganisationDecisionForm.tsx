import { useId, useState } from 'react';

import {
  admin_org_note_hint,
  admin_org_note_label,
  admin_org_reinstate,
  admin_org_suspend,
  type Locale,
} from '@founders-coffee/i18n';
import type { OrganisationStatus } from '@founders-coffee/core';

import {
  decisionRequest,
  decisionsFor,
  REVIEW_NOTE_MAX_LENGTH,
  type OrganisationDecision,
} from '../decisions';

const LABELS: Record<OrganisationDecision, typeof admin_org_suspend> = {
  suspend: admin_org_suspend,
  reinstate: admin_org_reinstate,
};

const STYLES: Record<OrganisationDecision, string> = {
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
  const [note, setNote] = useState('');
  const decisions = decisionsFor(status);
  if (decisions.length === 0) return null;

  const choose = (decision: OrganisationDecision) => {
    if (decisionRequest(decision, note)) onDecide(decision, note);
  };

  return (
    <div className="space-y-2 border-t border-base-300 pt-4">
      <label className="block text-label" htmlFor={`${id}-note`}>
        {admin_org_note_label({}, { locale })}
      </label>
      <textarea
        aria-describedby={`${id}-hint`}
        className="textarea textarea-sm md:textarea-md w-full"
        dir="auto"
        id={`${id}-note`}
        maxLength={REVIEW_NOTE_MAX_LENGTH}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        value={note}
      />
      <p className="text-caption text-neutral" id={`${id}-hint`}>
        {admin_org_note_hint({}, { locale })}
      </p>
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
