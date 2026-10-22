import {
  admin_hkn_no_prizes,
  admin_hkn_prize_place,
  admin_hkn_prize_provider,
  admin_hkn_prize_track,
  admin_hkn_prize_unconfirmed,
  admin_hkn_prize_value,
  admin_hkn_prizes,
  formatMoney,
  formatNumber,
  type Locale,
} from '@founders-coffee/i18n';
import { Badge } from '@founders-coffee/ui';

import type { HackathonReviewPrize, HackathonReviewTrack } from '../api';

export const HackathonPreviewPrizes = ({
  locale,
  prizes,
  tracks,
}: {
  locale: Locale;
  prizes: readonly HackathonReviewPrize[];
  tracks: readonly HackathonReviewTrack[];
}) => {
  const options = { locale };
  const trackTitle = (trackId: string | null) =>
    tracks.find((track) => track.id === trackId)?.title ?? null;
  return (
    <section className="space-y-2">
      <h3 className="text-body font-medium">{admin_hkn_prizes({}, options)}</h3>
      {prizes.length === 0 ? (
        <p className="text-body-sm text-neutral">
          {admin_hkn_no_prizes({}, options)}
        </p>
      ) : (
        <ol className="space-y-3">
          {prizes.map((prize) => {
            const track = trackTitle(prize.trackId);
            return (
              <li
                key={prize.id}
                className="space-y-1 rounded-box bg-base-200 p-3 text-body-sm"
              >
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-caption text-neutral">
                    {admin_hkn_prize_place(
                      { place: formatNumber(prize.place, locale) },
                      options,
                    )}
                  </span>
                  {prize.isConfirmed ? null : (
                    <Badge variant="outline">
                      {admin_hkn_prize_unconfirmed({}, options)}
                    </Badge>
                  )}
                </p>
                <p className="font-medium">
                  <bdi>{prize.title}</bdi>
                </p>
                <p className="whitespace-pre-line">
                  <bdi>{prize.description}</bdi>
                </p>
                <p>
                  {admin_hkn_prize_provider(
                    { name: prize.providerName },
                    options,
                  )}
                </p>
                {prize.value ? (
                  <p>
                    {admin_hkn_prize_value(
                      { value: formatMoney(prize.value, locale) },
                      options,
                    )}
                  </p>
                ) : null}
                {track ? (
                  <p>{admin_hkn_prize_track({ track }, options)}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
