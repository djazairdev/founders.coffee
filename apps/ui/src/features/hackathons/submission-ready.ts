import {
  HACKATHON_SUBMISSION_AI_STATEMENT_MAX,
  HACKATHON_SUBMISSION_DESCRIPTION_MAX,
  HACKATHON_SUBMISSION_TITLE_MAX,
  type HackathonAiPolicy,
} from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';
import {
  hackathon_submission_error_track,
  hackathon_submission_need_ai_statement,
  hackathon_submission_need_ai_tools,
  hackathon_submission_need_description,
  hackathon_submission_need_original,
  hackathon_submission_need_repository,
  hackathon_submission_need_title,
  type Locale,
} from '@founders-coffee/i18n';

import type { SubmissionDraftFields } from './api';
import { SUBMISSION_FIELD_IDS, type SubmissionField } from './submission-form';

export type SubmitField =
  | 'trackId'
  | 'title'
  | 'description'
  | 'repositoryUrl'
  | 'aiTools'
  | 'aiStatement'
  | 'original';

export type SubmissionFormErrors = Partial<
  Record<SubmissionField | SubmitField, string>
>;

export const SUBMISSION_ORIGINAL_ID = 'hackathon-submission-original';

const FIELD_IDS: Record<SubmissionField | SubmitField, string> = {
  ...SUBMISSION_FIELD_IDS,
  original: SUBMISSION_ORIGINAL_ID,
};

const FORM_ORDER: readonly (SubmissionField | SubmitField)[] = [
  'trackId',
  'title',
  'description',
  'repositoryUrl',
  'demoVideoUrl',
  'pullRequestUrls',
  'aiTools',
  'aiStatement',
  'original',
];

const SUBMIT_FIELDS: readonly SubmitField[] = [
  'trackId',
  'title',
  'description',
  'repositoryUrl',
  'aiTools',
  'aiStatement',
  'original',
];

const FORMAT_FIRST: readonly SubmissionField[] = ['repositoryUrl', 'aiTools'];

/** The element of the first field the errors name, in the order the form shows them. */
export const firstErrorField = (
  errors: SubmissionFormErrors,
): HTMLElement | null => {
  const field = FORM_ORDER.find((name) => errors[name]);
  return field ? document.getElementById(FIELD_IDS[field]) : null;
};

const messageFor = (field: SubmitField, locale: Locale): string => {
  const options = { locale };
  switch (field) {
    case 'trackId':
      return hackathon_submission_error_track({}, options);
    case 'title':
      return hackathon_submission_need_title(
        { max: HACKATHON_SUBMISSION_TITLE_MAX },
        options,
      );
    case 'description':
      return hackathon_submission_need_description(
        { max: HACKATHON_SUBMISSION_DESCRIPTION_MAX },
        options,
      );
    case 'repositoryUrl':
      return hackathon_submission_need_repository({}, options);
    case 'aiTools':
      return hackathon_submission_need_ai_tools({}, options);
    case 'aiStatement':
      return hackathon_submission_need_ai_statement(
        { max: HACKATHON_SUBMISSION_AI_STATEMENT_MAX },
        options,
      );
    default:
      return hackathon_submission_need_original({}, options);
  }
};

/**
 * What still keeps the project from being submitted (B-SUB-06), by the rules the server applies on
 * submit: the submission schema, with the original-work statement, and, for an AI-native
 * hackathon, at least one AI tool named. A field whose draft check already failed keeps that
 * message where it says more, a link that is not HTTPS or a tool name too long, and otherwise takes
 * the submission's own range. Empty when it can go.
 */
export const missingForSubmit = (
  fields: SubmissionDraftFields,
  input: {
    readonly aiPolicy: HackathonAiPolicy;
    readonly isOriginalWorkAttested: boolean;
    readonly draftErrors: SubmissionFormErrors;
    readonly locale: Locale;
  },
): SubmissionFormErrors => {
  const parsed = hackathons.submissionSchema.safeParse({
    ...fields,
    isOriginalWorkAttested: input.isOriginalWorkAttested,
  });
  const failed = new Set<string>(
    parsed.success
      ? []
      : parsed.error.issues.map((issue) => String(issue.path[0])),
  );
  if (failed.has('isOriginalWorkAttested')) failed.add('original');
  if (input.aiPolicy === 'ai_native' && fields.aiTools.length === 0)
    failed.add('aiTools');
  const missing: SubmissionFormErrors = Object.fromEntries(
    SUBMIT_FIELDS.filter((field) => failed.has(field)).map((field) => [
      field,
      messageFor(field, input.locale),
    ]),
  );
  const kept = FORMAT_FIRST.filter((field) => input.draftErrors[field]);
  return {
    ...input.draftErrors,
    ...missing,
    ...Object.fromEntries(
      kept.map((field) => [field, input.draftErrors[field]]),
    ),
  };
};
