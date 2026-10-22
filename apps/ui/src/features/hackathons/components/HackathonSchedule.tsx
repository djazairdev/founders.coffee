import { Circle, CircleCheck, CircleDot } from 'lucide-react';

import {
  hackathon_schedule_heading,
  hackathon_schedule_now,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonSchedule as Schedule } from '../api';
import { phaseSentence, scheduleSteps } from '../schedule';

const HEADING_ID = 'hackathon-schedule-heading';

export const HackathonSchedule = ({
  schedule,
  locale,
  timeZone,
  isCancelled,
}: {
  schedule: Schedule;
  locale: Locale;
  timeZone: string;
  isCancelled: boolean;
}) => {
  const steps = scheduleSteps(schedule, locale, timeZone);
  const current = isCancelled
    ? -1
    : steps.findIndex((step) => step.phase === schedule.phase);
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="self-start rounded-box border border-base-300 bg-base-100 p-5"
    >
      <h2 id={HEADING_ID} className="font-display text-h4 font-semibold">
        {hackathon_schedule_heading({}, { locale })}
      </h2>
      {isCancelled ? null : (
        <p className="mt-2 text-body-sm">
          {phaseSentence(schedule, locale, timeZone)}
        </p>
      )}
      <ol className="timeline timeline-vertical timeline-compact mt-4">
        {steps.map((step, index) => {
          const isCurrent = index === current;
          const isDone = index < current;
          const Icon = isDone ? CircleCheck : isCurrent ? CircleDot : Circle;
          return (
            <li key={step.phase} aria-current={isCurrent ? 'step' : undefined}>
              {index > 0 ? (
                <hr className={index <= current ? 'bg-primary' : undefined} />
              ) : null}
              <div className="timeline-middle">
                <Icon
                  aria-hidden="true"
                  className={`size-5 ${isDone || isCurrent ? 'text-primary' : 'text-neutral'}`}
                />
              </div>
              <div className="timeline-end mb-4 ms-2">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {step.title}
                  {isCurrent ? (
                    <span className="badge badge-sm badge-primary">
                      {hackathon_schedule_now({}, { locale })}
                    </span>
                  ) : null}
                </p>
                {step.lines.map((line) => (
                  <p key={line} className="text-body-sm text-neutral">
                    {line}
                  </p>
                ))}
              </div>
              {index < steps.length - 1 ? (
                <hr className={index < current ? 'bg-primary' : undefined} />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
};
