import type { EventFormat } from '@founders-coffee/core';
import {
  event_format_hybrid,
  event_format_online,
  type Locale,
} from '@founders-coffee/i18n';

const NAMES: Partial<Record<EventFormat, typeof event_format_online>> = {
  online: event_format_online,
  hybrid: event_format_hybrid,
};

/**
 * The label an online or hybrid event carries wherever it is listed, or null for one held only in
 * a room, which is what every event was before it had a format and needs no word for it. A list
 * item read without its format is labelled as one in a room rather than failing the whole list.
 */
export const eventFormatName = (
  format: EventFormat,
  locale: Locale,
): string | null => NAMES[format]?.({}, { locale }) ?? null;
