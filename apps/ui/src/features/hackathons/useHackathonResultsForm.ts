import { useState } from 'react';

import type { HackathonResultsView } from './api';
import { usePublishHackathonResults } from './results-hooks';

export const RESULTS_REASON_ID = 'hackathon-results-reason';

/**
 * The state behind publishing a hackathon's results (B-JDG-09): the reason scores are missing, the
 * order each tie is put in, and the last check before it is done for good. With a reason owed, the
 * organiser is taken to the field and no check opens.
 */
export const useHackathonResultsForm = ({
  eventId,
  view,
}: {
  eventId: string;
  view: HackathonResultsView;
}) => {
  const publish = usePublishHackathonResults(eventId);
  const [reason, setReason] = useState('');
  const [isReasonMissing, setIsReasonMissing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [order, setOrder] = useState<readonly (readonly string[])[]>(
    view.tiedGroups,
  );

  const move = (groupIndex: number, index: number, delta: -1 | 1) => {
    const target = index + delta;
    const group = order[groupIndex];
    const moved = group?.[index];
    const displaced = group?.[target];
    if (!moved || !displaced) return;
    setOrder(
      order.map((entries, position) =>
        position === groupIndex
          ? entries.map((entry, place) =>
              place === index ? displaced : place === target ? moved : entry,
            )
          : entries,
      ),
    );
  };

  const changeReason = (value: string) => {
    setReason(value);
    setIsReasonMissing(false);
  };

  const request = () => {
    publish.reset();
    if (view.missingEntries.length > 0 && reason.trim() === '') {
      setIsReasonMissing(true);
      document.getElementById(RESULTS_REASON_ID)?.focus();
      return;
    }
    setIsConfirming(true);
  };

  const confirm = () => {
    setIsConfirming(false);
    publish.mutate({
      eventId,
      missingScoresReason: reason,
      tieOrder: order.flat(),
    });
  };

  return {
    reason,
    isReasonMissing,
    isConfirming,
    order,
    isPublishing: publish.isPending,
    error: publish.error,
    move,
    changeReason,
    request,
    confirm,
    keep: () => setIsConfirming(false),
  };
};
