import type { RefObject } from 'react';

import {
  hackathon_results_panel_empty,
  hackathon_results_panel_error,
  hackathon_results_panel_heading,
  hackathon_results_panel_intro,
  hackathon_results_panel_loading,
  hackathon_results_panel_published,
  hackathon_results_panel_waiting,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, LoadingStatus, StatusMessage } from '@founders-coffee/ui';

import type { HackathonResultsView } from '../api';
import { useFocusAfterChange } from '../../../lib/useFocusAfterChange';
import { useHackathonResults } from '../results-hooks';
import { scheduleMoment } from '../schedule';
import { HackathonResultsList } from './HackathonResultsList';
import { HackathonResultsPublish } from './HackathonResultsPublish';

const HEADING_ID = 'hackathon-results-heading';

const Standing = ({
  eventId,
  view,
  publishedRef,
  locale,
  timeZone,
}: {
  eventId: string;
  view: HackathonResultsView;
  publishedRef: RefObject<HTMLDivElement | null>;
  locale: Locale;
  timeZone: string;
}) => {
  const options = { locale };
  if (view.stage === 'waiting')
    return (
      <p className="mt-2 text-body-sm text-neutral">
        {hackathon_results_panel_waiting(
          { date: scheduleMoment(view.judgingEndsAt, locale, timeZone) },
          options,
        )}
      </p>
    );
  if (view.stage === 'published')
    return (
      <>
        <StatusMessage
          ref={publishedRef}
          tabIndex={-1}
          variant="success"
          className="mt-3"
        >
          {hackathon_results_panel_published(
            {
              date: scheduleMoment(
                view.publishedAt ?? view.judgingEndsAt,
                locale,
                timeZone,
              ),
            },
            options,
          )}
        </StatusMessage>
        <HackathonResultsList entries={view.entries} locale={locale} />
      </>
    );
  if (view.entries.length === 0)
    return (
      <p className="mt-2 text-body-sm text-neutral">
        {hackathon_results_panel_empty({}, options)}
      </p>
    );
  return (
    <>
      <p className="mt-2 text-body-sm text-neutral">
        {hackathon_results_panel_intro({}, options)}
      </p>
      <HackathonResultsList entries={view.entries} locale={locale} />
      <HackathonResultsPublish eventId={eventId} view={view} locale={locale} />
    </>
  );
};

export const HackathonResultsPanel = ({
  eventId,
  locale,
  timeZone,
}: {
  eventId: string;
  locale: Locale;
  timeZone: string;
}) => {
  const query = useHackathonResults(eventId, true);
  const view = query.data;
  const publishedRef = useFocusAfterChange<HTMLDivElement>(view?.stage);
  if (view?.stage === 'unavailable') return null;
  return (
    <section aria-labelledby={HEADING_ID} className="mt-8">
      <h2 id={HEADING_ID} className="font-display text-h4">
        {hackathon_results_panel_heading({}, { locale })}
      </h2>
      {view ? (
        <Standing
          key={view.stage}
          eventId={eventId}
          view={view}
          publishedRef={publishedRef}
          locale={locale}
          timeZone={timeZone}
        />
      ) : query.isError ? (
        <StatusMessage
          variant="error"
          className="mt-3"
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              {retry({}, { locale })}
            </Button>
          }
        >
          {hackathon_results_panel_error({}, { locale })}
        </StatusMessage>
      ) : (
        <LoadingStatus
          className="mt-3"
          label={hackathon_results_panel_loading({}, { locale })}
        />
      )}
    </section>
  );
};
