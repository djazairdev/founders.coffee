import { Plus } from 'lucide-react';

import {
  hackathon_prize_add,
  hackathon_prizes_empty,
  hackathon_prizes_locked_hint,
  hackathon_prizes_needs_details,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import { useFocusAfterChange } from '../../../lib/useFocusAfterChange';
import type { HackathonDraftView } from '../api';
import type { HackathonFeedback } from '../hackathon-feedback';
import {
  NEW_PRIZE_KEY,
  PRIZE_ADD_ID,
  useHackathonPrizes,
} from '../useHackathonPrizes';
import { HackathonPrizeCard } from './HackathonPrizeCard';
import { HackathonPrizeConfirmForm } from './HackathonPrizeConfirmForm';
import { HackathonPrizeForm } from './HackathonPrizeForm';

const PrizesList = ({
  draft,
  timeZone,
  locale,
  onFeedback,
}: {
  draft: HackathonDraftView;
  timeZone: string;
  locale: Locale;
  onFeedback: HackathonFeedback;
}) => {
  const form = useHackathonPrizes({ draft, locale, onFeedback });
  const list = useFocusAfterChange<HTMLDivElement>(
    `${form.editing}:${form.confirming}:${draft.prizes.length}`,
  );
  const formFor = (key: string, isConfirmed: boolean) => (
    <HackathonPrizeForm
      form={form}
      formKey={key}
      isConfirmed={isConfirmed}
      locale={locale}
    />
  );
  return (
    <div ref={list} tabIndex={-1} className="grid gap-4">
      {draft.stage === 'locked' ? (
        <StatusMessage variant="info">
          {hackathon_prizes_locked_hint({}, { locale })}
        </StatusMessage>
      ) : null}
      {draft.prizes.length === 0 ? (
        <p className="text-body-sm text-neutral">
          {hackathon_prizes_empty({}, { locale })}
        </p>
      ) : (
        <ol className="grid gap-4">
          {draft.prizes.map((prize) => (
            <li
              key={prize.id}
              className="rounded-box border border-base-300 p-3"
            >
              {form.editing === prize.id ? (
                formFor(prize.id, prize.confirmation !== null)
              ) : (
                <HackathonPrizeCard
                  form={form}
                  locale={locale}
                  prize={prize}
                  timeZone={timeZone}
                />
              )}
              {form.confirming === prize.id ? (
                <HackathonPrizeConfirmForm
                  form={form}
                  locale={locale}
                  prizeId={prize.id}
                />
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {form.editing === NEW_PRIZE_KEY ? formFor(NEW_PRIZE_KEY, false) : null}
      {form.canAdd && form.editing !== NEW_PRIZE_KEY ? (
        <div>
          <Button
            id={PRIZE_ADD_ID}
            variant="outline"
            onClick={() => form.open(null)}
          >
            <Plus aria-hidden="true" className="size-4" />
            {hackathon_prize_add({}, { locale })}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export const HackathonPrizesSection = ({
  draft,
  timeZone,
  locale,
  onFeedback,
}: {
  draft: HackathonDraftView;
  timeZone: string;
  locale: Locale;
  onFeedback: HackathonFeedback;
}) => (
  <div className="grid gap-4">
    {draft.details ? (
      <PrizesList
        draft={draft}
        locale={locale}
        timeZone={timeZone}
        onFeedback={onFeedback}
      />
    ) : (
      <StatusMessage variant="info">
        {hackathon_prizes_needs_details({}, { locale })}
      </StatusMessage>
    )}
  </div>
);
