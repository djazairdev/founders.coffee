import { useState } from 'react';
import { flushSync } from 'react-dom';

import { appErrorCode } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';
import {
  hackathon_prize_error_gone,
  hackathon_prize_recorded,
  hackathon_prize_saved,
  hackathon_prize_withdrawn,
  type Locale,
} from '@founders-coffee/i18n';

import { seekField } from '../events/seek-field';
import type { HackathonDraftView, HackathonPrizeView } from './api';
import type { HackathonFeedback } from './hackathon-feedback';
import { hackathonEditError } from './edit-errors';
import {
  checkConfirmationNote,
  checkPrize,
  emptyPrize,
  prizeDraftOf,
  prizeFieldId,
  nextAvailablePrizePlace,
  type PrizeDraft,
  type PrizeErrors,
  type PrizeField,
} from './hackathon-prize-form';
import {
  useAddHackathonPrize,
  useChangeHackathonPrize,
  useConfirmHackathonPrize,
  useRemoveHackathonPrize,
} from './hooks';

export const NEW_PRIZE_KEY = 'new';
export const PRIZE_ADD_ID = 'hackathon-prize-add';
export const prizeNoteId = (prizeId: string) =>
  `hackathon-prize-${prizeId}-note`;

const seekId = (id: string) => {
  const element = document.getElementById(id);
  if (element) seekField(element);
};

/**
 * A hackathon's prizes as organisers manage them (B-HKN-14): one prize open in the form at a time,
 * new or saved, and one confirmation at a time. Each action sends the version the organiser saw
 * and the hackathon is read again after, so the list always shows what was saved. What a prize
 * allows follows the hackathon's stage and whether it is confirmed, by the rules the server applies.
 */
export const useHackathonPrizes = ({
  draft,
  locale,
  onFeedback,
}: {
  draft: HackathonDraftView;
  locale: Locale;
  onFeedback: HackathonFeedback;
}) => {
  const add = useAddHackathonPrize();
  const change = useChangeHackathonPrize();
  const remove = useRemoveHackathonPrize();
  const confirm = useConfirmHackathonPrize();
  const [editing, setEditing] = useState<string | null>(null);
  const [values, setValues] = useState<PrizeDraft>(emptyPrize);
  const [isProviderRequired, setIsProviderRequired] = useState(false);
  const [errors, setErrors] = useState<PrizeErrors>({});
  const [confirming, setConfirming] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const isBusy =
    add.isPending || change.isPending || remove.isPending || confirm.isPending;

  const failed = (error: unknown) =>
    onFeedback(
      appErrorCode(error) === 'hackathon_prize_not_found'
        ? hackathon_prize_error_gone({}, { locale })
        : hackathonEditError(error, locale),
      'error',
    );

  const open = (prize: HackathonPrizeView | null) => {
    if (isBusy) return;
    setConfirming(null);
    flushSync(() => {
      setEditing(prize?.id ?? NEW_PRIZE_KEY);
      setValues(
        prize
          ? prizeDraftOf(prize)
          : emptyPrize(nextAvailablePrizePlace(draft.prizes)),
      );
      setIsProviderRequired(prize !== null && prize.providerName !== null);
      setErrors({});
    });
    seekId(prizeFieldId(prize?.id ?? NEW_PRIZE_KEY, 'title'));
  };

  const close = () => {
    const was = editing;
    flushSync(() => setEditing(null));
    seekId(
      was && was !== NEW_PRIZE_KEY
        ? `hackathon-prize-${was}-change`
        : PRIZE_ADD_ID,
    );
  };

  const set = (field: PrizeField) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const save = () => {
    if (isBusy || editing === null) return;
    const check = checkPrize(
      values,
      draft.event.currency,
      locale,
      isProviderRequired,
    );
    if (!check.ok) {
      flushSync(() => setErrors(check.errors));
      const message = check.errors[check.first];
      if (message) onFeedback(message, 'error');
      seekId(prizeFieldId(editing, check.first));
      return;
    }
    const edit = { eventId: draft.event.id, version: draft.version };
    const done = {
      onSuccess: () => {
        onFeedback(hackathon_prize_saved({}, { locale }), 'success');
        close();
      },
      onError: failed,
    };
    if (editing === NEW_PRIZE_KEY)
      add.mutate({ ...edit, prize: check.prize }, done);
    else change.mutate({ ...edit, prizeId: editing, prize: check.prize }, done);
  };

  const withdraw = (prize: HackathonPrizeView) => {
    if (isBusy) return;
    remove.mutate(
      { eventId: draft.event.id, version: draft.version, prizeId: prize.id },
      {
        onSuccess: () => {
          onFeedback(hackathon_prize_withdrawn({}, { locale }), 'success');
          seekId(PRIZE_ADD_ID);
        },
        onError: failed,
      },
    );
  };

  const openConfirm = (prize: HackathonPrizeView) => {
    if (isBusy) return;
    flushSync(() => {
      setEditing(null);
      setConfirming(prize.id);
      setNote('');
      setNoteError(null);
    });
    seekId(prizeNoteId(prize.id));
  };

  const closeConfirm = () => {
    const was = confirming;
    flushSync(() => setConfirming(null));
    if (was) seekId(`hackathon-prize-${was}-confirm`);
  };

  const record = () => {
    if (isBusy || confirming === null) return;
    const checked = checkConfirmationNote(note, locale);
    if ('error' in checked) {
      setNoteError(checked.error);
      onFeedback(checked.error, 'error');
      seekId(prizeNoteId(confirming));
      return;
    }
    confirm.mutate(
      {
        eventId: draft.event.id,
        version: draft.version,
        prizeId: confirming,
        note: checked.note,
      },
      {
        onSuccess: () => {
          onFeedback(hackathon_prize_recorded({}, { locale }), 'success');
          setConfirming(null);
        },
        onError: failed,
      },
    );
  };

  return {
    editing,
    values,
    errors,
    isProviderRequired,
    confirming,
    note,
    noteError,
    isBusy,
    canAdd: hackathons.isPrizeAddable(draft.stage),
    canChange: hackathons.isPrizeChangeable(draft.stage),
    canWithdraw: (prize: HackathonPrizeView) =>
      hackathons.isPrizeRemovable(draft.stage, prize.confirmation !== null),
    canConfirm: (prize: HackathonPrizeView) =>
      prize.providerName !== null &&
      hackathons.isPrizeConfirmable(draft.stage, prize.confirmation !== null),
    open,
    close,
    set,
    save,
    withdraw,
    openConfirm,
    closeConfirm,
    setNote: (next: string) => {
      setNote(next);
      setNoteError(null);
    },
    record,
  };
};
