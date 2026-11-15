import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { DayPicker, TZDate } from 'react-day-picker';

import {
  direction,
  hackathon_date_before_min,
  hackathon_date_format,
  hackathon_date_invalid,
  hackathon_date_required,
  hackathon_open_calendar,
  type Locale,
} from '@founders-coffee/i18n';
import { DAYPICKER_LOCALE } from '../../../components/host/daypicker-locale';
import { dateValue, parseDateValue } from '../hackathon-date';

type HackathonDateFieldProps = {
  id: string;
  label: string;
  value: string;
  min: string;
  locale: Locale;
  timeZone: string;
  align: 'start' | 'end';
  showValidation: boolean;
  onChange: (value: string) => void;
};

export const HackathonDateField = ({
  id,
  label,
  value,
  min,
  locale,
  timeZone,
  align,
  showValidation,
  onChange,
}: HackathonDateFieldProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedDate = parseDateValue(value, timeZone);
  const minDate =
    parseDateValue(min, timeZone) ?? new TZDate(Date.now(), timeZone);
  const hasInvalidDate = value.length > 0 && selectedDate === null;
  const isBeforeMinimum = selectedDate !== null && value.localeCompare(min) < 0;
  const isInvalid =
    (hasBlurred || showValidation) &&
    (!value || hasInvalidDate || isBeforeMinimum);
  const validationMessage = !value
    ? hackathon_date_required({}, { locale })
    : hasInvalidDate
      ? hackathon_date_invalid({}, { locale })
      : hackathon_date_before_min({}, { locale });

  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [isOpen]);

  const closeCalendar = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={rootRef}
      className="relative flex min-w-0 flex-col gap-1 text-body-sm text-neutral"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !isOpen) return;
        event.preventDefault();
        closeCalendar();
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="input input-sm md:input-md validator w-full">
        <input
          id={id}
          type="text"
          className="min-w-0 grow bg-transparent outline-none"
          inputMode="numeric"
          pattern="\d{4}-\d{2}-\d{2}"
          maxLength={10}
          placeholder={hackathon_date_format({}, { locale })}
          dir="ltr"
          value={value}
          onBlur={() => setHasBlurred(true)}
          aria-describedby={`${id}-validation`}
          aria-invalid={isInvalid}
          required
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          ref={triggerRef}
          type="button"
          className="btn btn-ghost btn-square btn-xs sm:btn-sm md:btn-md shrink-0"
          aria-label={`${hackathon_open_calendar({}, { locale })}: ${label}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={`${id}-calendar`}
          onClick={() => setIsOpen((open) => !open)}
        >
          <CalendarDays className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p id={`${id}-validation`} className="validator-hint text-caption">
        {validationMessage}
      </p>
      {isOpen ? (
        <div
          id={`${id}-calendar`}
          role="dialog"
          aria-label={label}
          className={`absolute top-full z-50 mt-1 w-96 max-w-[calc(100vw-2rem)] rounded-box border border-base-300 bg-base-100 p-2 shadow-[var(--shadow-2)] ${align === 'start' ? 'start-0' : 'end-0'}`}
        >
          <DayPicker
            className="react-day-picker host-daypicker hackathon-date-calendar"
            mode="single"
            autoFocus
            dir={direction(locale)}
            locale={DAYPICKER_LOCALE[locale]}
            numerals="latn"
            firstWeekContainsDate={1}
            numberOfMonths={1}
            showOutsideDays
            timeZone={timeZone}
            today={new TZDate(Date.now(), timeZone)}
            defaultMonth={selectedDate ?? minDate}
            selected={selectedDate ?? undefined}
            onSelect={(date) => {
              if (!date) return;
              onChange(dateValue(date));
              closeCalendar();
            }}
            disabled={{ before: minDate }}
          />
        </div>
      ) : null}
    </div>
  );
};
