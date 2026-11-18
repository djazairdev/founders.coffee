import type { Topic } from '@founders-coffee/core';
import { event_topics_label, type Locale } from '@founders-coffee/i18n';

import { topicLabel } from '../../features/profile/profile-labels';

export const EventTopics = ({
  locale,
  tags,
  className = '',
}: {
  locale: Locale;
  tags: readonly Topic[];
  className?: string;
}) =>
  tags.length === 0 ? null : (
    <ul
      aria-label={event_topics_label({}, { locale })}
      className={`flex flex-wrap gap-2 ${className}`}
    >
      {tags.map((tag) => (
        <li
          key={tag}
          className="inline-flex h-8 items-center rounded-full bg-base-100 px-3.5 text-body-sm font-medium text-base-content"
        >
          {topicLabel(tag, locale)}
        </li>
      ))}
    </ul>
  );
