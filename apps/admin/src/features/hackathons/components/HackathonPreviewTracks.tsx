import {
  admin_hkn_partner,
  admin_hkn_sources,
  admin_hkn_tracks,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonReviewTrack } from '../api';
import { trackKindLabel } from '../labels';

export const HackathonPreviewTracks = ({
  locale,
  tracks,
}: {
  locale: Locale;
  tracks: readonly HackathonReviewTrack[];
}) => (
  <section className="space-y-2">
    <h3 className="text-body font-medium">
      {admin_hkn_tracks({}, { locale })}
    </h3>
    <ol className="space-y-3">
      {tracks.map((track) => (
        <li
          key={track.id}
          className="space-y-1 rounded-box bg-base-200 p-3 text-body-sm"
        >
          <p className="text-caption text-neutral">
            {trackKindLabel(track.kind, locale)}
          </p>
          <p className="font-medium">
            <bdi>{track.title}</bdi>
          </p>
          <p className="whitespace-pre-line">
            <bdi>{track.brief}</bdi>
          </p>
          {track.partnerName ? (
            <p>{admin_hkn_partner({ name: track.partnerName }, { locale })}</p>
          ) : null}
          {track.sourceUrls.length > 0 ? (
            <div>
              <p className="text-caption text-neutral">
                {admin_hkn_sources({}, { locale })}
              </p>
              <ul className="list-inside list-disc">
                {track.sourceUrls.map((url) => (
                  <li key={url} className="break-all">
                    <a
                      className="link"
                      href={url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <bdi dir="ltr">{url}</bdi>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  </section>
);
