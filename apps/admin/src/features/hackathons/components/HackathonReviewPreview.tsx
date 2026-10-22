import {
  admin_hkn_not_given,
  admin_hkn_place,
  admin_hkn_preview,
  hackathon_details_ai_policy,
  hackathon_details_attendance,
  hackathon_details_licence,
  hackathon_languages_label,
  host_format_label,
  host_meeting_url_label,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonReviewItem } from '../api';
import {
  aiPolicyLabel,
  attendanceLabel,
  formatLabel,
  languageLabel,
} from '../labels';
import { HackathonPreviewPrizes } from './HackathonPreviewPrizes';
import { HackathonPreviewRubric } from './HackathonPreviewRubric';
import { HackathonPreviewTracks } from './HackathonPreviewTracks';

export const HackathonReviewPreview = ({
  locale,
  item,
}: {
  locale: Locale;
  item: HackathonReviewItem;
}) => {
  const options = { locale };
  const notGiven = admin_hkn_not_given({}, options);
  return (
    <details className="collapse collapse-arrow border border-base-300">
      <summary className="collapse-title text-body-sm font-medium">
        {admin_hkn_preview({}, options)}
      </summary>
      <div className="collapse-content space-y-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
          <dt className="text-neutral">{host_format_label({}, options)}</dt>
          <dd>{formatLabel(item.format, locale)}</dd>
          {item.venue ? (
            <>
              <dt className="text-neutral">{admin_hkn_place({}, options)}</dt>
              <dd>
                <bdi>{item.venue}</bdi>
              </dd>
            </>
          ) : null}
          {item.meetingUrl ? (
            <>
              <dt className="text-neutral">
                {host_meeting_url_label({}, options)}
              </dt>
              <dd className="break-all">
                <bdi dir="ltr">{item.meetingUrl}</bdi>
              </dd>
            </>
          ) : null}
          <dt className="text-neutral">
            {hackathon_languages_label({}, options)}
          </dt>
          <dd>
            {item.languages
              .map((language) => languageLabel(language, locale))
              .join(' · ')}
          </dd>
          <dt className="text-neutral">
            {hackathon_details_attendance({}, options)}
          </dt>
          <dd>
            {item.attendanceModes
              .map((mode) => attendanceLabel(mode, locale))
              .join(' · ')}
          </dd>
          <dt className="text-neutral">
            {hackathon_details_ai_policy({}, options)}
          </dt>
          <dd>
            <p>{aiPolicyLabel(item.aiPolicy, locale)}</p>
            {item.aiPolicyNote ? (
              <p className="whitespace-pre-line">
                <bdi>{item.aiPolicyNote}</bdi>
              </p>
            ) : null}
          </dd>
          <dt className="text-neutral">
            {hackathon_details_licence({}, options)}
          </dt>
          <dd className="whitespace-pre-line">
            {item.licenceNote ? <bdi>{item.licenceNote}</bdi> : notGiven}
          </dd>
        </dl>
        <HackathonPreviewTracks locale={locale} tracks={item.tracks} />
        <HackathonPreviewPrizes
          locale={locale}
          prizes={item.prizes}
          tracks={item.tracks}
        />
        <HackathonPreviewRubric criteria={item.criteria} locale={locale} />
      </div>
    </details>
  );
};
