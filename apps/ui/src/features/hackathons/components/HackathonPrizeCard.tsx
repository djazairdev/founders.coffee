import { BadgeCheck, Pencil, Trash2 } from 'lucide-react';

import {
  formatDate,
  hackathon_prize_change_label,
  hackathon_prize_confirm,
  hackathon_prize_confirm_label,
  hackathon_prize_confirmed,
  hackathon_prize_confirmed_on,
  hackathon_prize_not_public,
  hackathon_prize_provider_value,
  hackathon_prize_withdraw_label,
  type Locale,
} from '@founders-coffee/i18n';
import { Button } from '@founders-coffee/ui';

import type { HackathonPrizeView } from '../api';
import { prizePlaceLabel } from '../hackathon-prize-form';
import type { useHackathonPrizes } from '../useHackathonPrizes';

const medalFor = (place: number) => {
  switch (place) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return '🏅';
  }
};

export const HackathonPrizeCard = ({
  form,
  prize,
  timeZone,
  locale,
}: {
  form: ReturnType<typeof useHackathonPrizes>;
  prize: HackathonPrizeView;
  timeZone: string;
  locale: Locale;
}) => {
  const options = { locale };
  const { confirmation } = prize;
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          <span aria-hidden="true">{medalFor(prize.place)}</span>
          <bdi className="min-w-0 break-words">
            {prizePlaceLabel(prize.place, locale)} · {prize.title}
          </bdi>
          {prize.providerName !== null ? (
            <span
              className={`badge badge-sm badge-soft ${confirmation ? 'badge-success' : 'badge-warning'}`}
            >
              {confirmation
                ? hackathon_prize_confirmed({}, options)
                : hackathon_prize_not_public({}, options)}
            </span>
          ) : null}
        </p>
        {prize.description.trim() !== '' ? (
          <p className="mt-1 line-clamp-2 text-body-sm text-neutral">
            <bdi>{prize.description}</bdi>
          </p>
        ) : null}
        {prize.providerName !== null ? (
          <p className="mt-1 text-caption text-neutral">
            {hackathon_prize_provider_value(
              { name: prize.providerName },
              options,
            )}
          </p>
        ) : null}
        {confirmation ? (
          <details className="mt-1 text-caption text-neutral">
            <summary>{hackathon_prize_confirmed({}, options)}</summary>
            <p className="mt-1">
              {hackathon_prize_confirmed_on(
                {
                  date: formatDate(new Date(confirmation.confirmedAt), locale, {
                    timeZone,
                    dateStyle: 'medium',
                  }),
                },
                options,
              )}
            </p>
            <p className="whitespace-pre-line">
              <bdi>{confirmation.note}</bdi>
            </p>
          </details>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {form.canChange ? (
          <Button
            id={`hackathon-prize-${prize.id}-change`}
            variant="outline"
            aria-label={hackathon_prize_change_label(
              { title: prize.title },
              options,
            )}
            onClick={() => form.open(prize)}
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
        {form.canConfirm(prize) ? (
          <Button
            id={`hackathon-prize-${prize.id}-confirm`}
            variant="outline"
            aria-label={hackathon_prize_confirm_label(
              { title: prize.title },
              options,
            )}
            onClick={() => form.openConfirm(prize)}
          >
            <BadgeCheck aria-hidden="true" className="size-4" />
            {hackathon_prize_confirm({}, options)}
          </Button>
        ) : null}
        {form.canWithdraw(prize) ? (
          <Button
            variant="ghost"
            aria-label={hackathon_prize_withdraw_label(
              { title: prize.title },
              options,
            )}
            isBusy={form.isBusy}
            onClick={() => form.withdraw(prize)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
};
