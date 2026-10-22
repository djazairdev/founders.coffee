import {
  formatMoney,
  formatNumber,
  hackathon_prize_overall,
  hackathon_prize_place_value,
  hackathon_prize_provider_value,
  hackathon_prize_value_text,
  hackathon_prizes_heading,
  hackathon_track_partner_value,
  hackathon_track_sources,
  hackathon_tracks_heading,
  type Locale,
} from '@founders-coffee/i18n';

import type {
  HackathonOffer as Offer,
  PublicHackathonPrizeView,
  PublicHackathonTrack,
} from '../api';
import { TRACK_KIND_LABELS } from '../detail-labels';

const TRACKS_ID = 'hackathon-tracks-heading';
const PRIZES_ID = 'hackathon-prizes-heading';
const CARD = 'rounded-box border border-base-300 bg-base-100 p-4';

const withoutScheme = (url: string) => url.replace(/^https:\/\//u, '');

const Track = ({
  track,
  locale,
}: {
  track: PublicHackathonTrack;
  locale: Locale;
}) => {
  const options = { locale };
  return (
    <li className={`${CARD} grid gap-2`}>
      <p className="eyebrow">{TRACK_KIND_LABELS[track.kind]({}, options)}</p>
      <h3 className="font-display text-body-lg font-semibold break-words">
        <bdi>{track.title}</bdi>
      </h3>
      {track.partnerName ? (
        <p className="text-body-sm text-neutral">
          {hackathon_track_partner_value({ name: track.partnerName }, options)}
        </p>
      ) : null}
      <p className="whitespace-pre-line text-body-sm">
        <bdi>{track.brief}</bdi>
      </p>
      {track.sourceUrls.length > 0 ? (
        <div className="grid gap-1">
          <p className="text-caption text-neutral">
            {hackathon_track_sources({}, options)}
          </p>
          <ul className="grid gap-1 text-body-sm">
            {track.sourceUrls.map((url) => (
              <li key={url} className="min-w-0">
                <a
                  href={url}
                  dir="ltr"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="link break-all"
                >
                  {withoutScheme(url)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
};

const Prize = ({
  prize,
  trackTitle,
  locale,
}: {
  prize: PublicHackathonPrizeView;
  trackTitle: string | null;
  locale: Locale;
}) => {
  const options = { locale };
  return (
    <li className={`${CARD} grid gap-1`}>
      <p className="flex flex-wrap gap-x-2 text-caption text-neutral">
        <span>
          {hackathon_prize_place_value(
            { place: formatNumber(prize.place, locale) },
            options,
          )}
        </span>
        <span className="min-w-0">
          {trackTitle === null ? (
            hackathon_prize_overall({}, options)
          ) : (
            <bdi>{trackTitle}</bdi>
          )}
        </span>
      </p>
      <h3 className="font-display text-body-lg font-semibold break-words">
        <bdi>{prize.title}</bdi>
      </h3>
      <p className="whitespace-pre-line text-body-sm">
        <bdi>{prize.description}</bdi>
      </p>
      <p className="text-body-sm text-neutral">
        {hackathon_prize_provider_value({ name: prize.providerName }, options)}
      </p>
      {prize.value ? (
        <p className="text-body-sm font-medium">
          {hackathon_prize_value_text(
            { value: formatMoney(prize.value, locale) },
            options,
          )}
        </p>
      ) : null}
    </li>
  );
};

export const HackathonOffer = ({
  offer,
  locale,
}: {
  offer: Offer;
  locale: Locale;
}) => {
  const options = { locale };
  const titleOf = (trackId: string | null) =>
    offer.tracks.find((track) => track.id === trackId)?.title ?? null;
  return (
    <>
      {offer.tracks.length > 0 ? (
        <section aria-labelledby={TRACKS_ID} className="mt-8">
          <h2 id={TRACKS_ID} className="font-display text-h4 font-semibold">
            {hackathon_tracks_heading({}, options)}
          </h2>
          <ul className="mt-4 grid gap-3">
            {offer.tracks.map((track) => (
              <Track key={track.id} track={track} locale={locale} />
            ))}
          </ul>
        </section>
      ) : null}
      {offer.prizes.length > 0 ? (
        <section aria-labelledby={PRIZES_ID} className="mt-8">
          <h2 id={PRIZES_ID} className="font-display text-h4 font-semibold">
            {hackathon_prizes_heading({}, options)}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {offer.prizes.map((prize) => (
              <Prize
                key={prize.id}
                prize={prize}
                trackTitle={titleOf(prize.trackId)}
                locale={locale}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
};
