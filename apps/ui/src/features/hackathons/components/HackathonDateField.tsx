import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { DayPicker, TZDate } from 'react-day-picker';

import {
  direction,
  formatDate,
  hackathon_choose_date,
  hackathon_date_before_min,
  hackathon_date_invalid,
  hackathon_date_required,
  type Locale,
} from '@founders-coffee/i18n';
import { DAYPICKER_LOCALE } from '../../../components/host/daypicker-locale';
import { dateValue, parseDateValue } from '../hackathon-date';

type HackathonDateFieldProps = {
  id: string;
  label: string;
  value: string;
  min?: string;
  locale: Locale;
  timeZone: string;
  align: 'start' | 'end';
  isDisabled?: boolean;
  showValidation?: boolean;
  isInvalid?: boolean;
  describedBy?: string;
  hideValidation?: boolean;
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
  isDisabled = false,
  showValidation = false,
  isInvalid: externallyInvalid,
  describedBy,
  hideValidation = false,
  onChange,
}: HackathonDateFieldProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedDate = parseDateValue(value, timeZone);
  const minDate = min
    ? (parseDateValue(min, timeZone) ?? undefined)
    : undefined;
  const hasInvalidDate = value.length > 0 && selectedDate === null;
  const isBeforeMinimum =
    selectedDate !== null && min !== undefined && value.localeCompare(min) < 0;
  const hasValidationError =
    (hasBlurred || showValidation) &&
    (!value || hasInvalidDate || isBeforeMinimum);
  const isInvalid = externallyInvalid ?? hasValidationError;
  const validationMessage = !value
    ? hackathon_date_required({}, { locale })
    : hasInvalidDate
      ? hackathon_date_invalid({}, { locale })
      : hackathon_date_before_min({}, { locale });
  const calendarButtonText = selectedDate
    ? formatDate(selectedDate, locale, {
        timeZone,
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : hackathon_choose_date({}, { locale });
  const dateDescriptionId =
    describedBy ?? (hasValidationError ? `${id}-validation` : undefined);

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
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
          setHasBlurred(true);
          setIsOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !isOpen) return;
        event.preventDefault();
        closeCalendar();
      }}
    >
      <label id={`${id}-label`} htmlFor={id}>
        {label}
      </label>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`input input-sm md:input-md w-full justify-between text-start ${isInvalid ? 'input-error' : ''}`}
        disabled={isDisabled}
        aria-invalid={isInvalid}
        aria-describedby={dateDescriptionId}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? `${id}-calendar` : undefined}
        onClick={() => {
          if (!isDisabled) setIsOpen((open) => !open);
        }}
      >
        <bdi id={`${id}-value`} dir="auto" className="min-w-0 grow truncate">
          {calendarButtonText}
        </bdi>
        <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
      </button>
      {!hideValidation && hasValidationError ? (
        <p id={`${id}-validation`} className="text-caption text-error">
          {validationMessage}
        </p>
      ) : null}
      {isOpen ? (
        <div
          id={`${id}-calendar`}
          role="dialog"
          aria-label={label}
          className={`hackathon-date-calendar-panel absolute top-full z-[100] mt-1 w-96 max-w-[calc(100vw-2rem)] rounded-box border border-base-300 bg-base-100 p-2 shadow-[var(--shadow-2)] ${align === 'start' ? 'start-0' : 'end-0'}`}
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
            defaultMonth={
              selectedDate ?? minDate ?? new TZDate(Date.now(), timeZone)
            }
            selected={selectedDate ?? undefined}
            onSelect={(date) => {
              onChange(date ? dateValue(date) : '');
              closeCalendar();
            }}
            disabled={minDate ? { before: minDate } : undefined}
          />
        </div>
      ) : null}
    </div>
  );
};
