import type { ReactNode } from 'react';

import {
  hackathon_judging_entry_team,
  hackathon_screenshots_label,
  hackathon_submission_ai_statement,
  hackathon_submission_ai_tools,
  hackathon_submission_demo_video,
  hackathon_submission_description,
  hackathon_submission_pull_requests,
  hackathon_submission_repository,
  hackathon_submission_track,
  type Locale,
} from '@founders-coffee/i18n';

import type { JudgeEntryPageView } from '../api';
import { HackathonScreenshotImage } from './HackathonScreenshotImage';

const HEADING_ID = 'hackathon-judge-entry-heading';

const Detail = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div>
    <dt className="text-label">{label}</dt>
    <dd className="mt-1 text-body-sm break-words">{children}</dd>
  </div>
);

const EntryLink = ({ url }: { url: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    dir="ltr"
    className="link break-all"
  >
    {url}
  </a>
);

export const HackathonJudgeEntryDetails = ({
  entry,
  screenshots,
  locale,
}: {
  entry: NonNullable<JudgeEntryPageView['entry']>;
  screenshots: JudgeEntryPageView['screenshots'];
  locale: Locale;
}) => {
  const options = { locale };
  return (
    <section aria-labelledby={HEADING_ID} className="mt-6">
      <h2 id={HEADING_ID} className="font-display text-h4">
        <bdi className="break-words">{entry.title}</bdi>
      </h2>
      <dl className="mt-3 grid gap-3">
        <Detail label={hackathon_judging_entry_team({}, options)}>
          <bdi>{entry.teamName}</bdi>
        </Detail>
        {entry.trackTitle ? (
          <Detail label={hackathon_submission_track({}, options)}>
            <bdi>{entry.trackTitle}</bdi>
          </Detail>
        ) : null}
        <Detail label={hackathon_submission_description({}, options)}>
          <span className="whitespace-pre-line">
            <bdi>{entry.description}</bdi>
          </span>
        </Detail>
        {screenshots.length > 0 ? (
          <Detail label={hackathon_screenshots_label({}, options)}>
            <ul className="grid gap-3 sm:grid-cols-3">
              {screenshots.map((screenshot, index) => (
                <li key={screenshot.id}>
                  <HackathonScreenshotImage
                    screenshot={screenshot}
                    position={index + 1}
                    title={entry.title}
                    locale={locale}
                  />
                </li>
              ))}
            </ul>
          </Detail>
        ) : null}
        <Detail label={hackathon_submission_repository({}, options)}>
          <EntryLink url={entry.repositoryUrl} />
        </Detail>
        {entry.demoVideoUrl ? (
          <Detail label={hackathon_submission_demo_video({}, options)}>
            <EntryLink url={entry.demoVideoUrl} />
          </Detail>
        ) : null}
        {entry.pullRequestUrls.length > 0 ? (
          <Detail label={hackathon_submission_pull_requests({}, options)}>
            <ul className="grid gap-1">
              {entry.pullRequestUrls.map((url) => (
                <li key={url}>
                  <EntryLink url={url} />
                </li>
              ))}
            </ul>
          </Detail>
        ) : null}
        {entry.aiTools.length > 0 ? (
          <Detail label={hackathon_submission_ai_tools({}, options)}>
            <ul className="flex flex-wrap gap-1">
              {entry.aiTools.map((tool) => (
                <li key={tool} className="badge badge-sm badge-soft">
                  <bdi>{tool}</bdi>
                </li>
              ))}
            </ul>
          </Detail>
        ) : null}
        <Detail label={hackathon_submission_ai_statement({}, options)}>
          <span className="whitespace-pre-line">
            <bdi>{entry.aiStatement}</bdi>
          </span>
        </Detail>
      </dl>
    </section>
  );
};
