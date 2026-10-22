import { useRef, useState } from 'react';
import { DayPicker, TZDate, type DateRange } from 'react-day-picker';

import {
  direction,
  formatDate,
  hackathon_demo_day_time,
  hackathon_kickoff_time,
  hackathon_schedule_summary,
  type Locale,
  type ZonedDateTimeError,
} from '@founders-coffee/i18n';
import { Input, StatusMessage } from '@founders-coffee/ui';

import { DAYPICKER_LOCALE } from '../../../components/host/daypicker-locale';
import {
  DEFAULT_DEMO_DAY_TIME,
  DEFAULT_KICKOFF_TIME,
  HACKATHON_MAX_DAYS,
  resolveHackathonSchedule,
  wallTime,
} from '../hackathon-schedule';

type HackathonScheduleStepProps = {
  locale: Locale;
  timeZone: string;
  startsAt: number | null;
  endsAt: number | null;
  error?: string;
  onChange: (startsAt: number | null, endsAt: number | null) => void;
  onError: (error: ZonedDateTimeError | null) => void;
};

export const HackathonScheduleStep = ({
  locale,
  timeZone,
  startsAt,
  endsAt,
  error,
  onChange,
  onError,
}: HackathonScheduleStepProps) => {
  const [days, setDays] = useState<DateRange | undefined>(() =>
    startsAt && endsAt
      ? {
          from: new TZDate(startsAt, timeZone),
          to: new TZDate(endsAt, timeZone),
        }
      : undefined,
  );
  const [kickoffTime, setKickoffTime] = useState(() =>
    startsAt ? wallTime(startsAt, timeZone) : DEFAULT_KICKOFF_TIME,
  );
  const [demoDayTime, setDemoDayTime] = useState(() =>
    endsAt ? wallTime(endsAt, timeZone) : DEFAULT_DEMO_DAY_TIME,
  );
  const latest = useRef({ days, kickoffTime, demoDayTime });
  latest.current = { days, kickoffTime, demoDayTime };

  const update = (
    changes: Partial<{
      days: DateRange | undefined;
      kickoffTime: string;
      demoDayTime: string;
    }>,
  ) => {
    const nextState = { ...latest.current, ...changes };
    latest.current = nextState;
    const resolved = resolveHackathonSchedule(
      nextState.days,
      nextState.kickoffTime,
      nextState.demoDayTime,
      timeZone,
    );
    if (!resolved.ok) {
      onChange(null, null);
      onError(resolved.reason);
      return;
    }
    onError(null);
    onChange(resolved.startsAt, resolved.endsAt);
  };

  const today = new TZDate(Date.now(), timeZone);
  const shownDay = (epochMs: number) =>
    formatDate(new Date(epochMs), locale, {
      timeZone,
      day: 'numeric',
      month: 'long',
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col">
          <span className="mb-1 text-body-sm text-neutral">
            {hackathon_kickoff_time({}, { locale })}
          </span>
          <Input
            id="hackathon-kickoff-time"
            type="time"
            value={kickoffTime}
            required
            onChange={(event) => {
              setKickoffTime(event.target.value);
              update({ kickoffTime: event.target.value });
            }}
          />
        </label>
        <label className="flex min-w-0 flex-col">
          <span className="mb-1 text-body-sm text-neutral">
            {hackathon_demo_day_time({}, { locale })}
          </span>
          <Input
            id="hackathon-demo-day-time"
            type="time"
            value={demoDayTime}
            required
            onChange={(event) => {
              setDemoDayTime(event.target.value);
              update({ demoDayTime: event.target.value });
            }}
          />
        </label>
      </div>
      <div
        id="host-calendar"
        className="flex w-full items-center justify-center overflow-hidden"
      >
        <DayPicker
          className="react-day-picker host-daypicker"
          mode="range"
          dir={direction(locale)}
          locale={DAYPICKER_LOCALE[locale]}
          numerals="latn"
          firstWeekContainsDate={1}
          numberOfMonths={1}
          showOutsideDays
          timeZone={timeZone}
          today={today}
          defaultMonth={days?.from}
          selected={days}
          max={HACKATHON_MAX_DAYS}
          onSelect={(chosen) => {
            setDays(chosen);
            update({ days: chosen });
          }}
          disabled={{ before: today }}
        />
      </div>
      {startsAt !== null && endsAt !== null ? (
        <p className="text-body-sm text-neutral" aria-live="polite">
          {hackathon_schedule_summary(
            { kickoff: shownDay(startsAt), demoDay: shownDay(endsAt) },
            { locale },
          )}
        </p>
      ) : null}
      {error ? <StatusMessage variant="error">{error}</StatusMessage> : null}
    </div>
  );
};
