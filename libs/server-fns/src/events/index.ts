export {
  attachAttendance,
  type EventAttendance,
  type EventDetailItem,
  type EventWithAttendance,
} from './attendance.js';
export type {
  EventFeedCursor,
  EventFeedItem,
  EventFeedItemBase,
  EventFeedPage,
} from './resolver.js';
export type {
  EventCreateInput,
  EventUpdateInput,
} from '@founders-coffee/domain';
export type { EventCalendarAnswer } from './calendar.js';
export type {
  EventPage,
  PublicHackathonPrizeView,
  PublicHackathonTrack,
} from './page.js';
export type { HackathonSchedule } from './hackathon-schedule.js';
export type {
  EventCalendarRequestInput,
  EventCancelRequestInput,
  EventCreateRequestInput,
  EventPageRequestInput,
  EventUpdateRequestInput,
  OrganisationEventCreateRequestInput,
  PublicEventFeedRequestInput,
  RepeatEventRequestInput,
} from './schemas.js';
export { publicEventFeedRequestSchema } from './schemas.js';
export {
  cancelEvent,
  createEvent,
  getEvent,
  getEventCalendarAnswer,
  getEventCardData,
  getEventPage,
  getHostedEvents,
  getMyJoinedEvents,
  getPublicEventFeed,
  getRepeatEventTemplate,
  getUpcomingEvents,
  updateEvent,
} from './rpc.js';
export { createOrganisationEvent } from './organisation-rpc.js';
export type { HostedEventItem, HostedEventPage } from './hosted.js';
export type { PublicEventFeedPage } from './public-feed.js';
export type { RepeatEventTemplate } from './repeat.js';
