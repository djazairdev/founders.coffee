import {
  HACKATHON_SUBMISSION_DESCRIPTION_MAX,
  HACKATHON_SUBMISSION_PULL_REQUEST_MAX,
  HACKATHON_SUBMISSION_TITLE_MAX,
  HACKATHON_SUBMISSION_URL_MAX,
} from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';
import {
  hackathon_submission_error_description,
  hackathon_submission_error_pull_requests,
  hackathon_submission_error_title,
  hackathon_submission_error_url,
  type Locale,
} from '@founders-coffee/i18n';

import type { SubmissionDraftFields, SubmissionPageView } from './api';

export const SUBMISSION_TITLE_MAX = HACKATHON_SUBMISSION_TITLE_MAX;
export const SUBMISSION_DESCRIPTION_MAX = HACKATHON_SUBMISSION_DESCRIPTION_MAX;
export const SUBMISSION_URL_MAX = HACKATHON_SUBMISSION_URL_MAX;
export const SUBMISSION_PULL_REQUEST_MAX =
  HACKATHON_SUBMISSION_PULL_REQUEST_MAX;

export type SubmissionField =
  | 'title'
  | 'description'
  | 'repositoryUrl'
  | 'demoVideoUrl'
  | 'pullRequestUrls';

export const SUBMISSION_FIELD_ORDER: readonly SubmissionField[] = [
  'title',
  'description',
  'repositoryUrl',
  'demoVideoUrl',
  'pullRequestUrls',
];

export const SUBMISSION_FIELD_IDS: Record<SubmissionField | 'trackId', string> =
  {
    trackId: 'hackathon-submission-track',
    title: 'hackathon-submission-title',
    description: 'hackathon-submission-description',
    repositoryUrl: 'hackathon-submission-repository',
    demoVideoUrl: 'hackathon-submission-demo-video',
    pullRequestUrls: 'hackathon-submission-pull-requests',
  };

export type SubmissionFormDraft = {
  readonly trackId: string;
  readonly title: string;
  readonly description: string;
  readonly repositoryUrl: string;
  readonly demoVideoUrl: string;
  readonly pullRequestUrls: string;
};

type Entry = NonNullable<SubmissionPageView['entry']>;

export type SubmissionDraftCheck =
  | {
      readonly ok: true;
      readonly draft: SubmissionDraftFields;
    }
  | {
      readonly ok: false;
      readonly errors: Partial<Record<SubmissionField, string>>;
    };

/** The form's fields as the team's saved project fills them, or empty before its first save. */
export const formDraftOf = (entry: Entry | null): SubmissionFormDraft => ({
  trackId: entry?.trackId ?? '',
  title: entry?.title ?? '',
  description: entry?.description ?? '',
  repositoryUrl: entry?.repositoryUrl ?? '',
  demoVideoUrl: entry?.demoVideoUrl ?? '',
  pullRequestUrls: entry?.pullRequestUrls.join('\n') ?? '',
});

const linesOf = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

const blankAsNull = (text: string) => (text.trim() === '' ? null : text);

const messageFor = (field: SubmissionField, locale: Locale): string => {
  const options = { locale };
  switch (field) {
    case 'title':
      return hackathon_submission_error_title(
        { max: SUBMISSION_TITLE_MAX },
        options,
      );
    case 'description':
      return hackathon_submission_error_description(
        { max: SUBMISSION_DESCRIPTION_MAX },
        options,
      );
    case 'pullRequestUrls':
      return hackathon_submission_error_pull_requests(
        { max: SUBMISSION_PULL_REQUEST_MAX },
        options,
      );
    default:
      return hackathon_submission_error_url({}, options);
  }
};

/**
 * Check the project with the draft schema the server applies (B-SUB-05), naming what holds each
 * field back. Pull requests are kept only for an open-source track, one link per line; the AI
 * answers the form does not ask for here keep what the team saved.
 */
export const checkSubmissionDraft = (
  form: SubmissionFormDraft,
  options: {
    readonly isOpenSource: boolean;
    readonly entry: Entry | null;
    readonly locale: Locale;
  },
): SubmissionDraftCheck => {
  const parsed = hackathons.submissionDraftSchema.safeParse({
    trackId: form.trackId === '' ? null : form.trackId,
    title: form.title,
    description: form.description,
    repositoryUrl: blankAsNull(form.repositoryUrl),
    demoVideoUrl: blankAsNull(form.demoVideoUrl),
    pullRequestUrls: options.isOpenSource ? linesOf(form.pullRequestUrls) : [],
    aiTools: options.entry?.aiTools ?? [],
    aiStatement: options.entry?.aiStatement ?? null,
  });
  if (parsed.success) return { ok: true, draft: parsed.data };
  const failed = new Set(parsed.error.issues.map((issue) => issue.path[0]));
  return {
    ok: false,
    errors: Object.fromEntries(
      SUBMISSION_FIELD_ORDER.filter((field) => failed.has(field)).map(
        (field) => [field, messageFor(field, options.locale)],
      ),
    ),
  };
};
