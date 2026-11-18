import { lazy, Suspense, useState } from 'react';

import type { HackathonReportTarget } from '@founders-coffee/core';
import {
  hackathon_report_already,
  hackathon_report_open,
  hackathon_report_open_label,
  hackathon_report_sent,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

const loadDialog = () =>
  import('./HackathonReportDialog').then((module) => ({
    default: module.HackathonReportDialog,
  }));

const HackathonReportDialog = lazy(loadDialog);

const preloadDialog = () => {
  void loadDialog().catch(() => undefined);
};

const DONE = { sent: hackathon_report_sent, already: hackathon_report_already };

export const HackathonReportButton = ({
  eventId,
  targetType,
  targetId,
  name,
  locale,
}: {
  eventId: string;
  targetType: HackathonReportTarget;
  targetId: string;
  name: string;
  locale: Locale;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [done, setDone] = useState<keyof typeof DONE | null>(null);

  if (done)
    return (
      <div ref={(status) => status?.focus()} tabIndex={-1}>
        <StatusMessage variant="success">
          {DONE[done]({}, { locale })}
        </StatusMessage>
      </div>
    );

  return (
    <>
      <button
        type="button"
        aria-label={hackathon_report_open_label({ name }, { locale })}
        className="tap-target link link-hover min-h-6 w-fit text-caption text-neutral"
        onPointerEnter={preloadDialog}
        onFocus={preloadDialog}
        onTouchStart={preloadDialog}
        onClick={() => setIsOpen(true)}
      >
        {hackathon_report_open({}, { locale })}
      </button>
      {isOpen ? (
        <Suspense fallback={null}>
          <HackathonReportDialog
            eventId={eventId}
            targetType={targetType}
            targetId={targetId}
            locale={locale}
            onClose={() => setIsOpen(false)}
            onDone={setDone}
          />
        </Suspense>
      ) : null}
    </>
  );
};
