import { Plus } from 'lucide-react';

import {
  hackathon_prize_add,
  hackathon_prize_recorded,
  hackathon_prize_saved,
  hackathon_prize_withdrawn,
  hackathon_prizes_empty,
  hackathon_prizes_heading,
  hackathon_prizes_hint,
  hackathon_prizes_locked_hint,
  hackathon_prizes_needs_details,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { HackathonDraftView } from '../api';
import {
  NEW_PRIZE_KEY,
  PRIZE_ADD_ID,
  useHackathonPrizes,
} from '../useHackathonPrizes';
import { HackathonPrizeCard } from './HackathonPrizeCard';
import { HackathonPrizeConfirmForm } from './HackathonPrizeConfirmForm';
import { HackathonPrizeForm } from './HackathonPrizeForm';

const HEADING_ID = 'hackathon-prizes-heading';

const NOTICES = {
  saved: hackathon_prize_saved,
  withdrawn: hackathon_prize_withdrawn,
  recorded: hackathon_prize_recorded,
} as const;

const PrizesList = ({
  draft,
  timeZone,
  locale,
}: {
  draft: HackathonDraftView;
  timeZone: string;
  locale: Locale;
}) => {
  const form = useHackathonPrizes({ draft, locale });
  const formFor = (key: string, isConfirmed: boolean) => (
    <HackathonPrizeForm
      currency={draft.event.currency}
      form={form}
      formKey={key}
      isConfirmed={isConfirmed}
      locale={locale}
      tracks={draft.tracks}
    />
  );
  return (
    <div className="grid gap-4">
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
              className="grid gap-4 rounded-box border border-base-300 p-4"
            >
              {form.editing === prize.id ? (
                formFor(prize.id, prize.confirmation !== null)
              ) : (
                <HackathonPrizeCard
                  form={form}
                  locale={locale}
                  prize={prize}
                  timeZone={timeZone}
                  tracks={draft.tracks}
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
      {form.failure ? (
        <StatusMessage variant="error">{form.failure}</StatusMessage>
      ) : null}
      {form.notice ? (
        <StatusMessage variant="success">
          {NOTICES[form.notice]({}, { locale })}
        </StatusMessage>
      ) : null}
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
}: {
  draft: HackathonDraftView;
  timeZone: string;
  locale: Locale;
}) => (
  <section aria-labelledby={HEADING_ID} className="mt-12">
    <h2 id={HEADING_ID} className="font-display text-h4">
      {hackathon_prizes_heading({}, { locale })}
    </h2>
    <p className="mt-1 mb-6 text-body-sm text-neutral">
      {hackathon_prizes_hint({}, { locale })}
    </p>
    {draft.details ? (
      <PrizesList draft={draft} locale={locale} timeZone={timeZone} />
    ) : (
      <StatusMessage variant="info">
        {hackathon_prizes_needs_details({}, { locale })}
      </StatusMessage>
    )}
  </section>
);
