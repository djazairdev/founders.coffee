import {
  formatDate,
  formatMoney,
  formatNumber,
  hackathon_prize_change,
  hackathon_prize_change_label,
  hackathon_prize_confirm,
  hackathon_prize_confirm_label,
  hackathon_prize_confirmed,
  hackathon_prize_confirmed_on,
  hackathon_prize_not_public,
  hackathon_prize_overall,
  hackathon_prize_place_value,
  hackathon_prize_provider_value,
  hackathon_prize_value_text,
  hackathon_prize_withdraw,
  hackathon_prize_withdraw_label,
  type Locale,
} from '@founders-coffee/i18n';
import { Button } from '@founders-coffee/ui';

import type { HackathonPrizeView, HackathonTrackView } from '../api';
import type { useHackathonPrizes } from '../useHackathonPrizes';

export const HackathonPrizeCard = ({
  form,
  prize,
  tracks,
  timeZone,
  locale,
}: {
  form: ReturnType<typeof useHackathonPrizes>;
  prize: HackathonPrizeView;
  tracks: readonly HackathonTrackView[];
  timeZone: string;
  locale: Locale;
}) => {
  const options = { locale };
  const track = tracks.find((candidate) => candidate.id === prize.trackId);
  const { confirmation } = prize;
  return (
    <div className="grid gap-2">
      <p className="flex flex-wrap items-center gap-2 text-body-sm">
        <span className="text-neutral">
          {hackathon_prize_place_value(
            { place: formatNumber(prize.place, locale) },
            options,
          )}
        </span>
        <span className="min-w-0 text-neutral">
          {track ? (
            <bdi>{track.title}</bdi>
          ) : (
            hackathon_prize_overall({}, options)
          )}
        </span>
        <span
          className={`badge badge-sm badge-soft ${confirmation ? 'badge-success' : 'badge-warning'}`}
        >
          {confirmation
            ? hackathon_prize_confirmed({}, options)
            : hackathon_prize_not_public({}, options)}
        </span>
      </p>
      <h3 className="font-display text-h5">
        <bdi>{prize.title}</bdi>
      </h3>
      <p className="whitespace-pre-line text-body-sm">
        <bdi>{prize.description}</bdi>
      </p>
      <p className="text-body-sm">
        {hackathon_prize_provider_value({ name: prize.providerName }, options)}
      </p>
      {prize.value ? (
        <p className="text-body-sm">
          {hackathon_prize_value_text(
            { value: formatMoney(prize.value, locale) },
            options,
          )}
        </p>
      ) : null}
      {confirmation ? (
        <div className="rounded-box bg-base-200 p-3 text-body-sm">
          <p className="text-caption text-neutral">
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
        </div>
      ) : null}
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
            {hackathon_prize_change({}, options)}
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
            disabled={form.isBusy}
            onClick={() => form.withdraw(prize)}
          >
            {hackathon_prize_withdraw({}, options)}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
