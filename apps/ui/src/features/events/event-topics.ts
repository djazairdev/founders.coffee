import type { Topic } from '@founders-coffee/core';
import { events } from '@founders-coffee/domain';

import { TOPIC_OPTIONS } from '../profile/profile-labels';

export const EVENT_TOPIC_OPTIONS: readonly Topic[] = TOPIC_OPTIONS;
export const EVENT_TOPIC_LIMIT = events.EVENT_TAG_LIMIT;
