import { useRef, useState } from 'react';
import { TZDate } from 'react-day-picker';

import {
  formatDate,
  hackathon_demo_day_time,
  hackathon_end_date,
  hackathon_kickoff_time,
  hackathon_schedule_summary,
  hackathon_start_date,
  hackathon_time_format_hint,
  hackathon_time_invalid_format,
  type Locale,
  type ZonedDateTimeError,
} from '@founders-coffee/i18n';
import { Input, StatusMessage } from '@founders-coffee/ui';

import { dateValue, parseDateValue } from '../hackathon-date';
import {
  DEFAULT_DEMO_DAY_TIME,
  DEFAULT_KICKOFF_TIME,
  resolveHackathonSchedule,
  wallTime,
} from '../hackathon-schedule';
import { HackathonDateField } from './HackathonDateField';

type HackathonScheduleStepProps = {
  locale: Locale;
  timeZone: string;
  startsAt: number | null;
  endsAt: number | null;
  error?: string;
  showValidation: boolean;
  onChange: (startsAt: number | null, endsAt: number | null) => void;
  onError: (error: ZonedDateTimeError | null) => void;
};

const isValid24HourTime = (value: string) =>
  /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

export const HackathonScheduleStep = ({
  locale,
  timeZone,
  startsAt,
  endsAt,
  error,
  showValidation,
  onChange,
  onError,
}: HackathonScheduleStepProps) => {
  const [startDate, setStartDate] = useState(() =>
    startsAt === null ? '' : dateValue(new TZDate(startsAt, timeZone)),
  );
  const [endDate, setEndDate] = useState(() =>
    endsAt === null ? '' : dateValue(new TZDate(endsAt, timeZone)),
  );
  const [kickoffTime, setKickoffTime] = useState(() =>
    startsAt ? wallTime(startsAt, timeZone) : DEFAULT_KICKOFF_TIME,
  );
  const [demoDayTime, setDemoDayTime] = useState(() =>
    endsAt ? wallTime(endsAt, timeZone) : DEFAULT_DEMO_DAY_TIME,
  );
  const [hasBlurredKickoff, setHasBlurredKickoff] = useState(false);
  const [hasBlurredDemoDay, setHasBlurredDemoDay] = useState(false);
  const latest = useRef({ startDate, endDate, kickoffTime, demoDayTime });
  latest.current = { startDate, endDate, kickoffTime, demoDayTime };

  const update = (
    changes: Partial<{
      startDate: string;
      endDate: string;
      kickoffTime: string;
      demoDayTime: string;
    }>,
  ) => {
    const nextState = { ...latest.current, ...changes };
    latest.current = nextState;
    const from = parseDateValue(nextState.startDate, timeZone);
    const to = parseDateValue(nextState.endDate, timeZone);
    if (!from || !to) {
      onChange(null, null);
      onError(null);
      return;
    }
    const resolved = resolveHackathonSchedule(
      { from, to },
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

  const handleTimeChange = (
    field: 'kickoffTime' | 'demoDayTime',
    value: string,
  ) => {
    if (field === 'kickoffTime') setKickoffTime(value);
    else setDemoDayTime(value);
    const changes =
      field === 'kickoffTime' ? { kickoffTime: value } : { demoDayTime: value };
    latest.current = { ...latest.current, ...changes };
    if (!isValid24HourTime(value)) {
      onChange(null, null);
      onError('invalid_wall_time');
      return;
    }
    update(changes);
  };

  const today = dateValue(new TZDate(Date.now(), timeZone));
  const formatDay = (date: Date) =>
    formatDate(date, locale, {
      timeZone,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-3">
          <HackathonDateField
            id="hackathon-start-date"
            label={hackathon_start_date({}, { locale })}
            value={startDate}
            min={today}
            locale={locale}
            timeZone={timeZone}
            align="start"
            showValidation={showValidation}
            onChange={(value) => {
              setStartDate(value);
              update({ startDate: value });
            }}
          />
          <div className="flex min-w-0 flex-col gap-1 text-body-sm text-neutral">
            <label htmlFor="hackathon-kickoff-time">
              {hackathon_kickoff_time({}, { locale })}
            </label>
            <Input
              id="hackathon-kickoff-time"
              type="text"
              className="validator"
              inputMode="numeric"
              pattern="(?:[01]\d|2[0-3]):[0-5]\d"
              maxLength={5}
              dir="ltr"
              value={kickoffTime}
              required
              aria-invalid={
                (showValidation || hasBlurredKickoff) &&
                !isValid24HourTime(kickoffTime)
              }
              aria-describedby="hackathon-time-format-hint hackathon-kickoff-time-validation"
              onBlur={() => setHasBlurredKickoff(true)}
              onChange={(event) =>
                handleTimeChange('kickoffTime', event.target.value)
              }
            />
            <span
              id="hackathon-kickoff-time-validation"
              className="validator-hint text-caption"
            >
              {hackathon_time_invalid_format({}, { locale })}
            </span>
          </div>
        </div>
        <div className="grid gap-3">
          <HackathonDateField
            id="hackathon-end-date"
            label={hackathon_end_date({}, { locale })}
            value={endDate}
            min={startDate || today}
            locale={locale}
            timeZone={timeZone}
            align="end"
            showValidation={showValidation}
            onChange={(value) => {
              setEndDate(value);
              update({ endDate: value });
            }}
          />
          <div className="flex min-w-0 flex-col gap-1 text-body-sm text-neutral">
            <label htmlFor="hackathon-demo-day-time">
              {hackathon_demo_day_time({}, { locale })}
            </label>
            <Input
              id="hackathon-demo-day-time"
              type="text"
              className="validator"
              inputMode="numeric"
              pattern="(?:[01]\d|2[0-3]):[0-5]\d"
              maxLength={5}
              dir="ltr"
              value={demoDayTime}
              required
              aria-invalid={
                (showValidation || hasBlurredDemoDay) &&
                !isValid24HourTime(demoDayTime)
              }
              aria-describedby="hackathon-time-format-hint hackathon-demo-day-time-validation"
              onBlur={() => setHasBlurredDemoDay(true)}
              onChange={(event) =>
                handleTimeChange('demoDayTime', event.target.value)
              }
            />
            <span
              id="hackathon-demo-day-time-validation"
              className="validator-hint text-caption"
            >
              {hackathon_time_invalid_format({}, { locale })}
            </span>
          </div>
        </div>
      </div>
      <p id="hackathon-time-format-hint" className="text-body-sm text-neutral">
        {hackathon_time_format_hint({}, { locale })}
      </p>
      {startsAt !== null && endsAt !== null ? (
        <p className="text-body-sm text-neutral" aria-live="polite">
          {hackathon_schedule_summary(
            {
              kickoff: formatDay(new Date(startsAt)),
              demoDay: formatDay(new Date(endsAt)),
            },
            { locale },
          )}
        </p>
      ) : null}
      {error ? <StatusMessage variant="error">{error}</StatusMessage> : null}
    </div>
  );
};
