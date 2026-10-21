import type { Topic } from '@founders-coffee/core';
import {
  event_topics_label,
  host_topics_hint,
  type Locale,
} from '@founders-coffee/i18n';
import { ChipGroup, toggleChip } from '@founders-coffee/ui';

import {
  EVENT_TOPIC_LIMIT,
  EVENT_TOPIC_OPTIONS,
} from '../../features/events/event-topics';
import { topicLabel } from '../../features/profile/profile-labels';

export const EventTagsField = ({
  id,
  locale,
  value,
  onChange,
}: {
  id: string;
  locale: Locale;
  value: readonly Topic[];
  onChange: (next: Topic[]) => void;
}) => (
  <div className="flex flex-col">
    <span className="mb-1 block text-body-sm text-neutral">
      {event_topics_label({}, { locale })}
    </span>
    <ChipGroup
      id={id}
      options={EVENT_TOPIC_OPTIONS}
      selected={value}
      max={EVENT_TOPIC_LIMIT}
      groupLabel={event_topics_label({}, { locale })}
      describedBy={`${id}-hint`}
      labelFor={(topic) => topicLabel(topic, locale)}
      onToggle={(topic) =>
        onChange(toggleChip(value, topic, EVENT_TOPIC_LIMIT))
      }
    />
    <span id={`${id}-hint`} className="mt-2 text-caption text-neutral">
      {host_topics_hint({}, { locale })}
    </span>
  </div>
);
