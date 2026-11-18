import {
  error_body,
  error_title,
  not_found_body,
  not_found_title,
  type Locale,
} from '@founders-coffee/i18n';

import { NO_INDEX_VALUE } from './indexation';
import { buildPageTitle } from './seo';

export type ErrorPageKind = 'error' | 'notFound';

type MatchState = {
  readonly status: string;
  readonly _notFound?: boolean;
};

/**
 * Which error page this render is, if it is one, read from the root match as well as the list.
 *
 * Router Core represents a root-boundary 404 as a successful layout match with
 * `_notFound`. A nested boundary reports its `notFound` status directly.
 */
export const errorPageKind = (
  root: MatchState,
  matches: readonly MatchState[],
): ErrorPageKind | null => {
  const states = [root, ...matches];
  if (
    states.some(
      (match) => match.status === 'notFound' || match._notFound === true,
    )
  )
    return 'notFound';
  return states.some((match) => match.status === 'error') ? 'error' : null;
};

export const errorPageHead = (locale: Locale, kind: ErrorPageKind) => {
  const copy =
    kind === 'notFound'
      ? {
          title: not_found_title({}, { locale }),
          description: not_found_body({}, { locale }),
        }
      : {
          title: error_title({}, { locale }),
          description: error_body({}, { locale }),
        };
  return {
    meta: [
      { title: buildPageTitle(copy.title) },
      { name: 'description', content: copy.description },
      { name: 'robots', content: NO_INDEX_VALUE },
    ],
    links: [],
    scripts: [],
  };
};
