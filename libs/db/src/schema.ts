import { sql } from 'drizzle-orm';
import {
  check,
  index,
  foreignKey,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import {
  ACCOUNT_STATES,
  ATTENDANCE_OUTCOMES,
  AUDIT_ACTIONS,
  AUDIT_TARGETS,
  CHAT_CHANNEL_KINDS,
  CHAT_MESSAGE_KINDS,
  CHAT_MESSAGE_REMOVALS,
  CHAT_REPORT_REASONS,
  CHAT_REPORT_STATUSES,
  CITY_WAITLIST_LAUNCH_STATUSES,
  CITY_WAITLIST_NOTIFICATION_STATUSES,
  CLOSEOUT_OUTCOMES,
  CURRENCY_CODES,
  EVENT_FORMATS,
  EVENT_KINDS,
  ATTENDANCE_MODES,
  HACKATHON_AI_POLICIES,
  HACKATHON_INTEREST_LAUNCH_STATUSES,
  HACKATHON_JUDGE_STATUSES,
  HACKATHON_MENTOR_HELPS_WITH_MAX,
  HACKATHON_MENTOR_OFFICE_HOURS_MAX,
  HACKATHON_MENTOR_STATUSES,
  HACKATHON_RECUSAL_REASON_MAX,
  HACKATHON_REGISTRATION_SKILLS_MAX,
  HACKATHON_REGISTRATION_STATUSES,
  HACKATHON_PULL_REQUEST_STATUSES,
  HACKATHON_REPORT_REASONS,
  HACKATHON_REPORT_STATUSES,
  HACKATHON_REPORT_TARGETS,
  HACKATHON_REVIEW_STATUSES,
  HACKATHON_SCORE_COMMENT_MAX,
  HACKATHON_SUBMISSION_AI_STATEMENT_MAX,
  HACKATHON_SUBMISSION_AI_TOOL_MAX,
  HACKATHON_SUBMISSION_DESCRIPTION_MAX,
  HACKATHON_SUBMISSION_PULL_REQUEST_MAX,
  HACKATHON_SUBMISSION_STATUSES,
  HACKATHON_SUBMISSION_TITLE_MAX,
  HACKATHON_SUBMISSION_URL_MAX,
  HACKATHON_TEAM_DESCRIPTION_MAX,
  HACKATHON_TEAM_NAME_MAX,
  HACKATHON_TEAM_REQUEST_STATUSES,
  HACKATHON_TRACK_KINDS,
  EVENT_ORGANISER_ROLES,
  EVENT_STATUSES,
  FEEDBACK_RATINGS,
  HOST_TRUST_STATUSES,
  LOCALES,
  MARKET_DIRECTIONS,
  MARKET_STATES,
  METRIC_KEYS,
  NOTIFICATION_DELIVERY_CHANNELS,
  NOTIFICATION_FALLBACK_CHANNELS,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TEMPLATE_KEYS,
  OPERATIONS_SCOPES,
  OPERATION_REASONS,
  ORDER_PURPOSES,
  PROJECT_URL_MAX,
  PROJECT_TITLE_MAX,
  PROJECT_STATUSES,
  PROJECT_STAGES,
  PROJECT_SLUG_MIN,
  PROJECT_SLUG_MAX,
  PROJECT_PROBLEM_MAX,
  PROJECT_MEMBER_ROLES,
  PROJECT_DESCRIPTION_MAX,
  ORDER_STATUSES,
  ORGANISATION_INVITATION_STATUSES,
  ORGANISATION_KINDS,
  ORGANISATION_STATUSES,
  PROFILE_ASSET_STATUSES,
  PROFILE_PHOTO_MIME_TYPES,
  PROFILE_STAGES,
  PUSH_PLATFORMS,
  PUSH_SURFACES,
  REVIEW_BOTTLENECKS,
  RSVP_STATUSES,
  USER_ROLES,
  type AttendanceMode,
  type HackathonCriterionScale,
  type Topic,
} from '@founders-coffee/core';

export {
  ATTENDANCE_OUTCOMES,
  AUDIT_ACTIONS,
  AUDIT_TARGETS,
  CLOSEOUT_OUTCOMES,
  EVENT_STATUSES,
  FEEDBACK_RATINGS,
  HOST_TRUST_STATUSES,
  METRIC_KEYS,
  NOTIFICATION_DELIVERY_CHANNELS as NOTIFICATION_CHANNELS,
  NOTIFICATION_FALLBACK_CHANNELS,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TEMPLATE_KEYS,
  OPERATIONS_SCOPES,
  OPERATION_REASONS,
  ORDER_PURPOSES,
  ORDER_STATUSES,
  PROFILE_ASSET_STATUSES,
  PROFILE_PHOTO_MIME_TYPES,
  PUSH_PLATFORMS,
  PUSH_SURFACES,
  REVIEW_BOTTLENECKS,
  RSVP_LIFECYCLE_TEMPLATE_KEYS,
  RSVP_STATUSES,
  USER_ROLES,
} from '@founders-coffee/core';

export type { OrderPurpose, OrderStatus } from '@founders-coffee/core';

type MarketFeatureFlags = {
  events: boolean;
  hackathons: boolean;
  payments: boolean;
  recruiting: boolean;
  communityOperations?: boolean;
  meetupChat?: boolean;
};

export const markets = sqliteTable('markets', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  nameAr: text('name_ar'),
  nameFr: text('name_fr'),
  slug: text('slug').notNull().unique(),
  defaultLocale: text('default_locale', { enum: [...LOCALES] }).notNull(),
  defaultCurrency: text('default_currency', {
    enum: [...CURRENCY_CODES],
  }).notNull(),
  timezone: text('timezone').notNull(),
  direction: text('direction', { enum: [...MARKET_DIRECTIONS] }).notNull(),
  state: text('state', { enum: [...MARKET_STATES] }).notNull(),
  featureFlags: text('feature_flags', { mode: 'json' })
    .$type<MarketFeatureFlags>()
    .notNull(),
  brandOverrides: text('brand_overrides', { mode: 'json' }).$type<
    Record<string, unknown>
  >(),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;

export const user = sqliteTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: integer('email_verified', { mode: 'boolean' })
      .notNull()
      .default(false),
    image: text('image'),
    role: text('role', { enum: [...USER_ROLES] })
      .notNull()
      .default('member'),
    accountState: text('account_state', { enum: [...ACCOUNT_STATES] })
      .notNull()
      .default('active'),
    banned: integer('banned', { mode: 'boolean' }).default(false),
    banReason: text('ban_reason'),
    banExpires: integer('ban_expires', { mode: 'timestamp' }),
    phoneNumber: text('phone_number').unique(),
    phoneNumberVerified: integer('phone_number_verified', { mode: 'boolean' })
      .notNull()
      .default(false),
    localePref: text('locale_pref', { enum: [...LOCALES] }),
    closedAt: integer('closed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('user_closing_index')
      .on(table.closedAt)
      .where(sql`account_state = 'closing'`),
  ],
);

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    impersonatedBy: text('impersonated_by'),
    activeOrganizationId: text('active_organization_id'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex('session_id_user_unique').on(table.id, table.userId)],
);

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  providerId: text('provider_id').notNull(),
  accountId: text('account_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', {
    mode: 'timestamp',
  }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', {
    mode: 'timestamp',
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

/**
 * Better Auth's organisation plugin keeps organisers, their members and invitations in these three
 * tables (B-ORG-01). The plugin's own columns keep its names; ours follow them. An organisation
 * starts `pending` and is approved by an operator before it can run anything. `owner_left_at` is
 * when its last owner closed their account (B-ORG-12), which puts it in the admin queue until an
 * owner is named again. `reviewed_at` and `review_note` are the last operator decision on it and the
 * note given with it, which its owners read (B-ORG-06).
 */
export const organization = sqliteTable(
  'organization',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logo: text('logo'),
    metadata: text('metadata'),
    kind: text('kind', { enum: [...ORGANISATION_KINDS] }).notNull(),
    status: text('status', { enum: [...ORGANISATION_STATUSES] })
      .notNull()
      .default('pending'),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    cityCode: text('city_code'),
    description: text('description').notNull(),
    websiteUrl: text('website_url'),
    ownerLeftAt: integer('owner_left_at', { mode: 'timestamp' }),
    reviewNote: text('review_note'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('organization_market_status_index').on(
      table.marketCode,
      table.status,
    ),
    index('organization_owner_left_index')
      .on(table.ownerLeftAt)
      .where(sql`owner_left_at IS NOT NULL`),
  ],
);

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;

export const member = sqliteTable(
  'member',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('member_organization_user_unique').on(
      table.organizationId,
      table.userId,
    ),
    index('member_user_index').on(table.userId),
  ],
);

export type Member = typeof member.$inferSelect;

export const invitation = sqliteTable(
  'invitation',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role'),
    status: text('status', { enum: [...ORGANISATION_INVITATION_STATUSES] })
      .notNull()
      .default('pending'),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => user.id),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('invitation_organization_index').on(table.organizationId),
    index('invitation_email_index').on(table.email),
  ],
);

export type Invitation = typeof invitation.$inferSelect;

/**
 * Event — a free local meetup created by a host (FR-E1). Every event is free (FR-E2).
 *
 * `version` exists so an edit can refuse to land on a row that moved underneath it. `updated_at`
 * looks like it would do the same job and does not: it is second-resolution, so two saves inside
 * one second both match a timestamp guard and the later one silently wins. An edit here is not a
 * private document — changing the time notifies everyone who booked — so a lost update is a
 * message sent about a change nobody made. The counter is incremented by the conditional update
 * itself, which is what makes the guard exact rather than probable.
 *
 * The counter is published with the event rather than held back. A host editing a meetup has to
 * send the version they were looking at, and the page they were looking at is the ordinary event
 * response — so withholding it would mean a second request whose only job is to fetch a number. It
 * carries no personal content: the most it tells a reader is how many times this gathering has been
 * corrected.
 *
 * `slug` is deliberately not derived again after creation. It is generated from the title once,
 * and every link a host has already shared points at it, so a retitled meetup keeps its address
 * rather than 404ing the message sitting in somebody's WhatsApp thread.
 */
export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    hostId: text('host_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    stateCode: text('state_code').notNull(),
    cityCode: text('city_code').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    venue: text('venue'),
    startsAt: integer('starts_at', { mode: 'timestamp' }).notNull(),
    endsAt: integer('ends_at', { mode: 'timestamp' }),
    rsvps: integer('rsvps').notNull().default(0),
    language: text('language', { enum: [...LOCALES] }).notNull(),
    languages: text('languages', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    latitude: real('latitude'),
    longitude: real('longitude'),
    venueAddress: text('venue_address'),
    slug: text('slug').notNull(),
    status: text('status', { enum: [...EVENT_STATUSES] })
      .notNull()
      .default('published'),
    kind: text('kind', { enum: [...EVENT_KINDS] })
      .notNull()
      .default('meetup'),
    tags: text('tags', { mode: 'json' })
      .$type<Topic[]>()
      .notNull()
      .default(sql`'[]'`),
    format: text('format', { enum: [...EVENT_FORMATS] })
      .notNull()
      .default('in_person'),
    meetingUrl: text('meeting_url'),
    version: integer('version').notNull().default(1),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
    cancellationReason: text('cancellation_reason'),
  },
  (table) => [
    uniqueIndex('events_market_code_slug_unique').on(
      table.marketCode,
      table.slug,
    ),
    index('events_host_id_index').on(table.hostId),
  ],
);

export type Event = typeof events.$inferSelect;
export type VenuedEvent = Event & { readonly venue: string };
export type NewEvent = typeof events.$inferInsert;

/**
 * The organisations behind an event (B-EVT-17): at most one `lead`, the organisation it was created
 * as, and any number of `co_host`s (B-EVT-20). An event with no row here is a community event. The
 * row goes with its event or its organisation; the event itself stays when its organisation goes.
 */
export const eventOrganisers = sqliteTable(
  'event_organisers',
  {
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    organisationId: text('organisation_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    role: text('role', { enum: [...EVENT_ORGANISER_ROLES] }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.organisationId] }),
    uniqueIndex('event_organisers_one_lead_unique')
      .on(table.eventId)
      .where(sql`role = 'lead'`),
    index('event_organisers_organisation_index').on(table.organisationId),
  ],
);

export type EventOrganiser = typeof eventOrganisers.$inferSelect;

/**
 * The details that make an event a hackathon (B-HKN-01): one row beside an event of kind `hackathon`.
 *
 * Kickoff and demo day are the event's own `starts_at` and `ends_at`, so the event page, slug, chat
 * and notifications serve the hackathon unchanged. A `null` minimum age or capacity means none.
 * `registered_count` is how many registrations hold a place (B-REG-01), kept beside the capacity so
 * a registration can take a place in one atomic statement, as an RSVP does.
 */
export const hackathons = sqliteTable(
  'hackathons',
  {
    eventId: text('event_id')
      .primaryKey()
      .references(() => events.id, { onDelete: 'cascade' }),
    rules: text('rules'),
    minimumAge: integer('minimum_age'),
    attendanceModes: text('attendance_modes', { mode: 'json' })
      .$type<AttendanceMode[]>()
      .notNull(),
    teamMin: integer('team_min').notNull(),
    teamMax: integer('team_max').notNull(),
    capacity: integer('capacity'),
    registrationOpensAt: integer('registration_opens_at', {
      mode: 'timestamp',
    }).notNull(),
    registrationClosesAt: integer('registration_closes_at', {
      mode: 'timestamp',
    }).notNull(),
    submissionDeadlineAt: integer('submission_deadline_at', {
      mode: 'timestamp',
    }).notNull(),
    judgingEndsAt: integer('judging_ends_at', { mode: 'timestamp' }).notNull(),
    aiPolicy: text('ai_policy', { enum: [...HACKATHON_AI_POLICIES] }).notNull(),
    aiPolicyNote: text('ai_policy_note'),
    licenceNote: text('licence_note'),
    reviewStatus: text('review_status', {
      enum: [...HACKATHON_REVIEW_STATUSES],
    })
      .notNull()
      .default('draft'),
    reviewNote: text('review_note'),
    resultsPublishedAt: integer('results_published_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    registeredCount: integer('registered_count').notNull().default(0),
  },
  (table) => [
    index('hackathons_review_status_index').on(table.reviewStatus),
    check(
      'hackathons_team_size_check',
      sql`${table.teamMin} >= 1 AND ${table.teamMax} >= ${table.teamMin}`,
    ),
    check(
      'hackathons_capacity_check',
      sql`${table.capacity} IS NULL OR ${table.capacity} > 0`,
    ),
    check(
      'hackathons_registered_count_check',
      sql`${table.registeredCount} >= 0`,
    ),
    check(
      'hackathons_minimum_age_check',
      sql`${table.minimumAge} IS NULL OR ${table.minimumAge} > 0`,
    ),
    check(
      'hackathons_dates_check',
      sql`${table.registrationOpensAt} < ${table.registrationClosesAt} AND ${table.submissionDeadlineAt} < ${table.judgingEndsAt}`,
    ),
  ],
);

export type Hackathon = typeof hackathons.$inferSelect;
export type NewHackathon = typeof hackathons.$inferInsert;

/**
 * What a hackathon's teams build (B-HKN-03): a founder's real problem, a partner's technology, or the
 * open-source track. A partner technology track names its partner; an open-source track lists the
 * repositories or djazair.dev Hub issues it is built from. `position` orders a hackathon's tracks.
 */
export const hackathonTracks = sqliteTable(
  'hackathon_tracks',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => hackathons.eventId, { onDelete: 'cascade' }),
    kind: text('kind', { enum: [...HACKATHON_TRACK_KINDS] }).notNull(),
    title: text('title').notNull(),
    brief: text('brief').notNull(),
    partnerName: text('partner_name'),
    sourceUrls: text('source_urls', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    position: integer('position').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('hackathon_tracks_position_unique').on(
      table.eventId,
      table.position,
    ),
    uniqueIndex('hackathon_tracks_event_unique').on(table.id, table.eventId),
    check(
      'hackathon_tracks_partner_check',
      sql`(${table.kind} = 'partner_technology') = (${table.partnerName} IS NOT NULL)`,
    ),
    check(
      'hackathon_tracks_sources_check',
      sql`(${table.kind} = 'open_source') = (${table.sourceUrls} <> '[]')`,
    ),
    check('hackathon_tracks_position_check', sql`${table.position} >= 0`),
  ],
);

export type HackathonTrack = typeof hackathonTracks.$inferSelect;
export type NewHackathonTrack = typeof hackathonTracks.$inferInsert;

/**
 * What a hackathon's teams can win (B-HKN-04): a place, overall or in one of its own tracks, a title,
 * what the prize is and who provides it, and what it is worth as an indicative `Money` value when the
 * provider gives one. A track is the hackathon's own, which the composite key holds, and cannot be
 * removed while a prize names it.
 *
 * Nothing is promised before it is confirmed (V2): `confirmed_at` is when the provider confirmed the
 * prize in writing and `confirmation_note` the organisers' private record of who confirmed it and
 * how; they are set together. Public reads return confirmed prizes only and never the note.
 */
export const hackathonPrizes = sqliteTable(
  'hackathon_prizes',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => hackathons.eventId, { onDelete: 'cascade' }),
    trackId: text('track_id'),
    place: integer('place').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    providerName: text('provider_name').notNull(),
    valueAmountMinor: integer('value_amount_minor'),
    valueCurrency: text('value_currency', { enum: [...CURRENCY_CODES] }),
    confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
    confirmationNote: text('confirmation_note'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    foreignKey({
      columns: [table.trackId, table.eventId],
      foreignColumns: [hackathonTracks.id, hackathonTracks.eventId],
    }),
    index('hackathon_prizes_event_idx').on(table.eventId, table.place),
    index('hackathon_prizes_track_idx').on(table.trackId, table.eventId),
    check('hackathon_prizes_place_check', sql`${table.place} >= 1`),
    check(
      'hackathon_prizes_value_check',
      sql`(${table.valueAmountMinor} IS NULL AND ${table.valueCurrency} IS NULL) OR (${table.valueAmountMinor} > 0 AND ${table.valueCurrency} IS NOT NULL)`,
    ),
    check(
      'hackathon_prizes_confirmation_check',
      sql`(${table.confirmedAt} IS NULL) = (${table.confirmationNote} IS NULL)`,
    ),
  ],
);

export type HackathonPrize = typeof hackathonPrizes.$inferSelect;
export type NewHackathonPrize = typeof hackathonPrizes.$inferInsert;

/**
 * A hackathon's published rubric (B-HKN-05): each criterion its judges score, how much it weighs and
 * the scale it is scored on, 1 to 5 or 1 to 10. A hackathon has three or four whose weights add up to
 * 100, which the domain holds; the database refuses a weight or scale outside its range.
 */
export const hackathonCriteria = sqliteTable(
  'hackathon_criteria',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => hackathons.eventId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull(),
    weight: integer('weight').notNull(),
    scale: integer('scale').$type<HackathonCriterionScale>().notNull(),
    position: integer('position').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('hackathon_criteria_position_unique').on(
      table.eventId,
      table.position,
    ),
    uniqueIndex('hackathon_criteria_event_unique').on(table.id, table.eventId),
    check(
      'hackathon_criteria_weight_check',
      sql`${table.weight} BETWEEN 1 AND 100`,
    ),
    check('hackathon_criteria_scale_check', sql`${table.scale} IN (5, 10)`),
    check('hackathon_criteria_position_check', sql`${table.position} >= 0`),
  ],
);

export type HackathonCriterion = typeof hackathonCriteria.$inferSelect;
export type NewHackathonCriterion = typeof hackathonCriteria.$inferInsert;

/**
 * A member's registration for a hackathon (B-REG-01): one per member per hackathon.
 *
 * `status` is `registered` while it holds a place and `waitlisted` while it waits for one; a member
 * who leaves is `withdrawn` and one removed by the organisers `disqualified`, and both stay as the
 * record of what happened. `attendance_mode` is how the member takes part, from the modes the
 * hackathon offers. `code_of_conduct_accepted_at` is when they accepted it, which every registration
 * does, and `age_attested_at` when they confirmed the minimum age, null for a hackathon that has
 * none. `skills` is the line a member looking for a team shows the others, up to 140 characters.
 *
 * Account closure deletes the member's registrations and gives back the places they held.
 */
export const hackathonRegistrations = sqliteTable(
  'hackathon_registrations',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => hackathons.eventId, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status', { enum: [...HACKATHON_REGISTRATION_STATUSES] })
      .notNull()
      .default('registered'),
    attendanceMode: text('attendance_mode', {
      enum: [...ATTENDANCE_MODES],
    }).notNull(),
    codeOfConductAcceptedAt: integer('code_of_conduct_accepted_at', {
      mode: 'timestamp',
    }).notNull(),
    ageAttestedAt: integer('age_attested_at', { mode: 'timestamp' }),
    isLookingForTeam: integer('looking_for_team', { mode: 'boolean' })
      .notNull()
      .default(false),
    skills: text('skills'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('hackathon_registrations_event_user_unique').on(
      table.eventId,
      table.userId,
    ),
    index('hackathon_registrations_event_status_index').on(
      table.eventId,
      table.status,
      table.createdAt,
    ),
    index('hackathon_registrations_user_index').on(table.userId),
    check(
      'hackathon_registrations_skills_check',
      sql`${table.skills} IS NULL OR length(${table.skills}) <= ${sql.raw(String(HACKATHON_REGISTRATION_SKILLS_MAX))}`,
    ),
  ],
);

export type HackathonRegistration = typeof hackathonRegistrations.$inferSelect;
export type NewHackathonRegistration =
  typeof hackathonRegistrations.$inferInsert;

/**
 * A hackathon's teams (B-TEAM-01): our own tables, not Better Auth teams, because participants are
 * not members of the organising organisation (B8). A name is unique within its hackathon, whatever
 * its case; `is_looking_for_members` puts the team on the looking-for-a-team page.
 */
export const hackathonTeams = sqliteTable(
  'hackathon_teams',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => hackathons.eventId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    isLookingForMembers: integer('looking_for_members', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('hackathon_teams_event_unique').on(table.id, table.eventId),
    uniqueIndex('hackathon_teams_name_unique').on(
      table.eventId,
      sql`lower(${table.name})`,
    ),
    index('hackathon_teams_looking_index').on(
      table.eventId,
      table.isLookingForMembers,
    ),
    check(
      'hackathon_teams_name_check',
      sql`length(trim(${table.name})) BETWEEN 1 AND ${sql.raw(String(HACKATHON_TEAM_NAME_MAX))}`,
    ),
    check(
      'hackathon_teams_description_check',
      sql`${table.description} IS NULL OR length(${table.description}) <= ${sql.raw(String(HACKATHON_TEAM_DESCRIPTION_MAX))}`,
    ),
  ],
);

export type HackathonTeam = typeof hackathonTeams.$inferSelect;
export type NewHackathonTeam = typeof hackathonTeams.$inferInsert;

/**
 * Who is in a team. A participant is in one team per hackathon, which the unique `(event_id,
 * user_id)` holds, and has to be registered for it, which the key on their registration holds; the
 * team is the hackathon's own. A team has one captain, `is_captain`, held by a partial unique index.
 */
export const hackathonTeamMembers = sqliteTable(
  'hackathon_team_members',
  {
    teamId: text('team_id').notNull(),
    eventId: text('event_id').notNull(),
    userId: text('user_id').notNull(),
    isCaptain: integer('is_captain', { mode: 'boolean' })
      .notNull()
      .default(false),
    joinedAt: integer('joined_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.userId] }),
    foreignKey({
      columns: [table.teamId, table.eventId],
      foreignColumns: [hackathonTeams.id, hackathonTeams.eventId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.eventId, table.userId],
      foreignColumns: [
        hackathonRegistrations.eventId,
        hackathonRegistrations.userId,
      ],
    }).onDelete('cascade'),
    uniqueIndex('hackathon_team_members_event_user_unique').on(
      table.eventId,
      table.userId,
    ),
    uniqueIndex('hackathon_team_members_captain_unique')
      .on(table.teamId)
      .where(sql`is_captain = 1`),
  ],
);

export type HackathonTeamMember = typeof hackathonTeamMembers.$inferSelect;

/**
 * A team's invite links (B-TEAM-04). Only the token's hash is kept, so the table never holds a
 * working link; a link stops working at `expires_at` or once revoked. Who made it stays with the
 * team, from the tombstone once their account is closed.
 */
export const hackathonTeamInvites = sqliteTable(
  'hackathon_team_invites',
  {
    id: text('id').primaryKey(),
    teamId: text('team_id')
      .notNull()
      .references(() => hackathonTeams.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    revokedAt: integer('revoked_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('hackathon_team_invites_team_index').on(table.teamId)],
);

export type HackathonTeamInvite = typeof hackathonTeamInvites.$inferSelect;

/**
 * A registered participant asking to join a team (B-TEAM-05), which its captain accepts or
 * declines, or the participant cancels. One pending request per person per team, held by a partial
 * unique index; answered ones stay as the record of what happened.
 */
export const hackathonTeamRequests = sqliteTable(
  'hackathon_team_requests',
  {
    id: text('id').primaryKey(),
    teamId: text('team_id').notNull(),
    eventId: text('event_id').notNull(),
    userId: text('user_id').notNull(),
    status: text('status', { enum: [...HACKATHON_TEAM_REQUEST_STATUSES] })
      .notNull()
      .default('pending'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    decidedAt: integer('decided_at', { mode: 'timestamp' }),
  },
  (table) => [
    foreignKey({
      columns: [table.teamId, table.eventId],
      foreignColumns: [hackathonTeams.id, hackathonTeams.eventId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.eventId, table.userId],
      foreignColumns: [
        hackathonRegistrations.eventId,
        hackathonRegistrations.userId,
      ],
    }).onDelete('cascade'),
    uniqueIndex('hackathon_team_requests_pending_unique')
      .on(table.teamId, table.userId)
      .where(sql`status = 'pending'`),
    index('hackathon_team_requests_user_index').on(table.eventId, table.userId),
    check(
      'hackathon_team_requests_decided_check',
      sql`(${table.status} = 'pending') = (${table.decidedAt} IS NULL)`,
    ),
  ],
);

export type HackathonTeamRequest = typeof hackathonTeamRequests.$inferSelect;

/**
 * What a team builds and enters, one row per team (B-SUB-01). Stage D turns a submission into a
 * project page, so its fields stay close to a project's: a track, a title, a description, the
 * repository, a demo video and the pull requests behind it, the AI tools the team used and its
 * statement about them, and when it attested that the work is its own.
 *
 * A `draft` is the team's work in progress and may be incomplete; `submitted` holds everything a
 * submission needs and `submitted_at`, which the checks enforce; `disqualified` keeps what was
 * submitted. `version` guards the captain's saves, as an event's does, and each submit keeps a
 * snapshot in `hackathon_submission_versions`. The track and the team are the hackathon's own, by
 * composite keys; everything goes with the hackathon or the team.
 */
export const hackathonSubmissions = sqliteTable(
  'hackathon_submissions',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => hackathons.eventId, { onDelete: 'cascade' }),
    teamId: text('team_id').notNull(),
    trackId: text('track_id'),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    repositoryUrl: text('repository_url'),
    demoVideoUrl: text('demo_video_url'),
    pullRequestUrls: text('pull_request_urls', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    aiTools: text('ai_tools', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    aiStatement: text('ai_statement'),
    originalWorkAttestedAt: integer('original_work_attested_at', {
      mode: 'timestamp',
    }),
    status: text('status', { enum: HACKATHON_SUBMISSION_STATUSES })
      .notNull()
      .default('draft'),
    submittedAt: integer('submitted_at', { mode: 'timestamp' }),
    version: integer('version').notNull().default(1),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    foreignKey({
      columns: [table.teamId, table.eventId],
      foreignColumns: [hackathonTeams.id, hackathonTeams.eventId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.trackId, table.eventId],
      foreignColumns: [hackathonTracks.id, hackathonTracks.eventId],
    }),
    uniqueIndex('hackathon_submissions_team_unique').on(table.teamId),
    uniqueIndex('hackathon_submissions_event_unique').on(
      table.id,
      table.eventId,
    ),
    index('hackathon_submissions_event_status_index').on(
      table.eventId,
      table.status,
    ),
    index('hackathon_submissions_track_index').on(table.trackId, table.eventId),
    check(
      'hackathon_submissions_title_check',
      sql`length(trim(${table.title})) BETWEEN 1 AND ${sql.raw(String(HACKATHON_SUBMISSION_TITLE_MAX))}`,
    ),
    check(
      'hackathon_submissions_description_check',
      sql`length(${table.description}) <= ${sql.raw(String(HACKATHON_SUBMISSION_DESCRIPTION_MAX))}`,
    ),
    check(
      'hackathon_submissions_urls_check',
      sql`(${table.repositoryUrl} IS NULL OR length(${table.repositoryUrl}) <= ${sql.raw(String(HACKATHON_SUBMISSION_URL_MAX))}) AND (${table.demoVideoUrl} IS NULL OR length(${table.demoVideoUrl}) <= ${sql.raw(String(HACKATHON_SUBMISSION_URL_MAX))})`,
    ),
    check(
      'hackathon_submissions_lists_check',
      sql`json_array_length(${table.pullRequestUrls}) <= ${sql.raw(String(HACKATHON_SUBMISSION_PULL_REQUEST_MAX))} AND json_array_length(${table.aiTools}) <= ${sql.raw(String(HACKATHON_SUBMISSION_AI_TOOL_MAX))}`,
    ),
    check(
      'hackathon_submissions_statement_check',
      sql`${table.aiStatement} IS NULL OR length(${table.aiStatement}) <= ${sql.raw(String(HACKATHON_SUBMISSION_AI_STATEMENT_MAX))}`,
    ),
    check(
      'hackathon_submissions_submitted_check',
      sql`(${table.status} = 'draft') = (${table.submittedAt} IS NULL)`,
    ),
    check(
      'hackathon_submissions_complete_check',
      sql`${table.status} = 'draft' OR (${table.trackId} IS NOT NULL AND ${table.repositoryUrl} IS NOT NULL AND ${table.aiStatement} IS NOT NULL AND ${table.originalWorkAttestedAt} IS NOT NULL)`,
    ),
    check('hackathon_submissions_version_check', sql`${table.version} >= 1`),
  ],
);

export type HackathonSubmission = typeof hackathonSubmissions.$inferSelect;
export type NewHackathonSubmission = typeof hackathonSubmissions.$inferInsert;

/**
 * What a team submitted, as it was, each time it submitted (B-SUB-01): a snapshot keyed by the
 * submission and the version submitted, so a later draft never rewrites what judges saw. The
 * snapshot is complete by construction, since only a submit writes one. `submitted_by` is who
 * pressed submit; it stays with the snapshot after their account closes, as the tombstone.
 */
export const hackathonSubmissionVersions = sqliteTable(
  'hackathon_submission_versions',
  {
    submissionId: text('submission_id')
      .notNull()
      .references(() => hackathonSubmissions.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    trackId: text('track_id').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    repositoryUrl: text('repository_url').notNull(),
    demoVideoUrl: text('demo_video_url'),
    pullRequestUrls: text('pull_request_urls', { mode: 'json' })
      .$type<string[]>()
      .notNull(),
    aiTools: text('ai_tools', { mode: 'json' }).$type<string[]>().notNull(),
    aiStatement: text('ai_statement').notNull(),
    originalWorkAttestedAt: integer('original_work_attested_at', {
      mode: 'timestamp',
    }).notNull(),
    submittedAt: integer('submitted_at', { mode: 'timestamp' }).notNull(),
    submittedBy: text('submitted_by').references(() => user.id),
  },
  (table) => [primaryKey({ columns: [table.submissionId, table.version] })],
);

export type HackathonSubmissionVersion =
  typeof hackathonSubmissionVersions.$inferSelect;

/**
 * What the maintainers did with each pull request an open-source entry linked (B-SUB-08), as the
 * hackathon's organisers record it: reviewed or merged. A pull request without a row is simply
 * submitted. Rows are keyed by the link, so the results count only those still in the entry's last
 * submitted version.
 */
export const hackathonPullRequests = sqliteTable(
  'hackathon_pull_requests',
  {
    submissionId: text('submission_id')
      .notNull()
      .references(() => hackathonSubmissions.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    status: text('status', { enum: HACKATHON_PULL_REQUEST_STATUSES }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    primaryKey({ columns: [table.submissionId, table.url] }),
    check(
      'hackathon_pull_requests_status_check',
      sql`${table.status} IN ('submitted', 'reviewed', 'merged')`,
    ),
  ],
);

export type HackathonPullRequest = typeof hackathonPullRequests.$inferSelect;

/**
 * A member's report about an entry or a team of a hackathon (B-SAFE-01), for an administrator to
 * review: one per member and target, with a reason from a fixed list and no free text. The target is
 * kept by its type and id without a foreign key, so a report outlives a team that disbands, as chat
 * reports outlive their message. The reporter is never shown to the people reported. A report is
 * kept 24 months after its decision, and an open one until it is decided.
 *
 * The administrator's decision (B-SAFE-02) dismisses it or disqualifies the team. A disqualification
 * keeps the reason the team is told in `decision_reason` and what it rests on in `evidence`, on
 * every report it decided; a dismissal keeps neither.
 */
export const hackathonReports = sqliteTable(
  'hackathon_reports',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => hackathons.eventId, { onDelete: 'cascade' }),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    targetType: text('target_type', {
      enum: HACKATHON_REPORT_TARGETS,
    }).notNull(),
    targetId: text('target_id').notNull(),
    reporterId: text('reporter_id')
      .notNull()
      .references(() => user.id),
    reason: text('reason', { enum: HACKATHON_REPORT_REASONS }).notNull(),
    status: text('status', { enum: HACKATHON_REPORT_STATUSES })
      .notNull()
      .default('open'),
    reviewedBy: text('reviewed_by').references(() => user.id),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
    decisionReason: text('decision_reason'),
    evidence: text('evidence'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('hackathon_reports_target_reporter_unique').on(
      table.targetType,
      table.targetId,
      table.reporterId,
    ),
    index('hackathon_reports_market_status_index').on(
      table.marketCode,
      table.status,
      table.createdAt,
    ),
    index('hackathon_reports_reporter_index').on(table.reporterId),
    index('hackathon_reports_reviewed_at_index')
      .on(table.reviewedAt)
      .where(sql`reviewed_at IS NOT NULL`),
    check(
      'hackathon_reports_decision_check',
      sql`(${table.status} = 'open') = (${table.reviewedAt} IS NULL)`,
    ),
  ],
);

export type HackathonReport = typeof hackathonReports.$inferSelect;

/**
 * A hackathon's judges (B-JDG-01). Each place starts as an invite link the organisers make for one
 * judge, of which only the token's hash is kept; the judge accepts it with their account, which
 * fills `user_id`, or declines it, and the organisers may remove a judge. A member judges a
 * hackathon at most once, and an accepted judge always has an account.
 *
 * Judges are never deleted while their hackathon stands: their scores and recusals must stay
 * reproducible, so a closed account leaves its places against the tombstone, as it does the member
 * who made the link.
 */
export const hackathonJudges = sqliteTable(
  'hackathon_judges',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => hackathons.eventId, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id),
    status: text('status', { enum: [...HACKATHON_JUDGE_STATUSES] })
      .notNull()
      .default('invited'),
    tokenHash: text('token_hash').notNull().unique(),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => user.id),
    respondedAt: integer('responded_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('hackathon_judges_event_unique').on(table.id, table.eventId),
    uniqueIndex('hackathon_judges_user_unique').on(table.eventId, table.userId),
    index('hackathon_judges_user_index').on(table.userId),
    check(
      'hackathon_judges_accepted_check',
      sql`${table.status} != 'accepted' OR ${table.userId} IS NOT NULL`,
    ),
  ],
);

export type HackathonJudge = typeof hackathonJudges.$inferSelect;
export type NewHackathonJudge = typeof hackathonJudges.$inferInsert;

/**
 * A judge stepping away from an entry they cannot judge fairly (B-JDG-01), with their reason. Once
 * per judge and entry, and never undone, so it has no status; the judge and the entry are the same
 * hackathon's, by composite keys.
 */
export const hackathonRecusals = sqliteTable(
  'hackathon_recusals',
  {
    judgeId: text('judge_id').notNull(),
    submissionId: text('submission_id').notNull(),
    eventId: text('event_id').notNull(),
    reason: text('reason').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    primaryKey({ columns: [table.judgeId, table.submissionId] }),
    foreignKey({
      columns: [table.judgeId, table.eventId],
      foreignColumns: [hackathonJudges.id, hackathonJudges.eventId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.submissionId, table.eventId],
      foreignColumns: [hackathonSubmissions.id, hackathonSubmissions.eventId],
    }).onDelete('cascade'),
    index('hackathon_recusals_submission_index').on(table.submissionId),
    check(
      'hackathon_recusals_reason_check',
      sql`length(trim(${table.reason})) BETWEEN 1 AND ${sql.raw(String(HACKATHON_RECUSAL_REASON_MAX))}`,
    ),
  ],
);

export type HackathonRecusal = typeof hackathonRecusals.$inferSelect;

/**
 * A judge's score for one criterion of one entry (B-JDG-01), with an optional comment: one per
 * entry, judge and criterion. The value is held to 1 to 10 here and to the criterion's own scale by
 * the domain. The judge, the entry and the criterion are the same hackathon's, by composite keys; a
 * criterion with scores cannot be deleted, and by then the rubric is locked anyway.
 */
export const hackathonScores = sqliteTable(
  'hackathon_scores',
  {
    submissionId: text('submission_id').notNull(),
    judgeId: text('judge_id').notNull(),
    criterionId: text('criterion_id').notNull(),
    eventId: text('event_id').notNull(),
    value: integer('value').notNull(),
    comment: text('comment'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    primaryKey({
      columns: [table.submissionId, table.judgeId, table.criterionId],
    }),
    foreignKey({
      columns: [table.judgeId, table.eventId],
      foreignColumns: [hackathonJudges.id, hackathonJudges.eventId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.submissionId, table.eventId],
      foreignColumns: [hackathonSubmissions.id, hackathonSubmissions.eventId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.criterionId, table.eventId],
      foreignColumns: [hackathonCriteria.id, hackathonCriteria.eventId],
    }),
    index('hackathon_scores_judge_index').on(table.judgeId),
    index('hackathon_scores_criterion_index').on(table.criterionId),
    check('hackathon_scores_value_check', sql`${table.value} BETWEEN 1 AND 10`),
    check(
      'hackathon_scores_comment_check',
      sql`${table.comment} IS NULL OR length(${table.comment}) <= ${sql.raw(String(HACKATHON_SCORE_COMMENT_MAX))}`,
    ),
  ],
);

export type HackathonScore = typeof hackathonScores.$inferSelect;

/**
 * A hackathon's mentors (B-HKN-25), invited as its judges are: each place starts as an invite link
 * the organisers make for one mentor, of which only the token's hash is kept, and the mentor
 * accepts it with their account, which fills `user_id`, or declines it. A mentor says in a short
 * line what they help with and, optionally, when their office hours are; both are theirs, so a
 * closed account takes its places with it. A member mentors a hackathon at most once, and an
 * accepted mentor always has an account and a line.
 */
export const hackathonMentors = sqliteTable(
  'hackathon_mentors',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => hackathons.eventId, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    status: text('status', { enum: [...HACKATHON_MENTOR_STATUSES] })
      .notNull()
      .default('invited'),
    tokenHash: text('token_hash').notNull().unique(),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => user.id),
    helpsWith: text('helps_with'),
    officeHours: text('office_hours'),
    respondedAt: integer('responded_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('hackathon_mentors_user_unique').on(
      table.eventId,
      table.userId,
    ),
    index('hackathon_mentors_user_index').on(table.userId),
    check(
      'hackathon_mentors_accepted_check',
      sql`${table.status} != 'accepted' OR (${table.userId} IS NOT NULL AND ${table.helpsWith} IS NOT NULL)`,
    ),
    check(
      'hackathon_mentors_helps_with_check',
      sql`${table.helpsWith} IS NULL OR length(${table.helpsWith}) <= ${sql.raw(String(HACKATHON_MENTOR_HELPS_WITH_MAX))}`,
    ),
    check(
      'hackathon_mentors_office_hours_check',
      sql`${table.officeHours} IS NULL OR length(${table.officeHours}) <= ${sql.raw(String(HACKATHON_MENTOR_OFFICE_HOURS_MAX))}`,
    ),
  ],
);

export type HackathonMentor = typeof hackathonMentors.$inferSelect;

/**
 * A project page (B-PRJ-01): what a team or founder is building, the problem it solves, how far it
 * has come (idea, prototype, MVP, launched) and its links. In Stage B a project starts from a
 * hackathon entry, which `source_submission_id` names, once per entry; from Stage D any member
 * posts one, with no entry behind it, so the table already allows that. If the entry goes, the
 * project stays and forgets it.
 *
 * A `draft` is the team's until they publish it; a `published` project has a public page, and a
 * `hidden` one keeps its address but shows nothing. Search engines index a published page only
 * when the team turned `search_indexable` on (V17). `version` guards the owners' edits, as an
 * event's does. A project belongs to the market it was made in.
 */
export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    problem: text('problem').notNull(),
    description: text('description').notNull().default(''),
    stage: text('stage', { enum: [...PROJECT_STAGES] }).notNull(),
    repositoryUrl: text('repository_url'),
    demoUrl: text('demo_url'),
    websiteUrl: text('website_url'),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    sourceSubmissionId: text('source_submission_id').references(
      () => hackathonSubmissions.id,
      { onDelete: 'set null' },
    ),
    status: text('status', { enum: [...PROJECT_STATUSES] })
      .notNull()
      .default('draft'),
    isSearchIndexable: integer('search_indexable', { mode: 'boolean' })
      .notNull()
      .default(false),
    version: integer('version').notNull().default(1),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('projects_source_submission_unique').on(
      table.sourceSubmissionId,
    ),
    index('projects_market_status_index').on(
      table.marketCode,
      table.status,
      table.updatedAt,
    ),
    check(
      'projects_slug_check',
      sql`length(${table.slug}) BETWEEN ${sql.raw(String(PROJECT_SLUG_MIN))} AND ${sql.raw(String(PROJECT_SLUG_MAX))} AND ${table.slug} NOT GLOB '*[^a-z0-9-]*' AND ${table.slug} NOT GLOB '-*' AND ${table.slug} NOT GLOB '*-' AND ${table.slug} NOT GLOB '*--*'`,
    ),
    check(
      'projects_text_check',
      sql`length(trim(${table.title})) BETWEEN 1 AND ${sql.raw(String(PROJECT_TITLE_MAX))} AND length(${table.problem}) <= ${sql.raw(String(PROJECT_PROBLEM_MAX))} AND length(${table.description}) <= ${sql.raw(String(PROJECT_DESCRIPTION_MAX))}`,
    ),
    check(
      'projects_urls_check',
      sql`(${table.repositoryUrl} IS NULL OR length(${table.repositoryUrl}) <= ${sql.raw(String(PROJECT_URL_MAX))}) AND (${table.demoUrl} IS NULL OR length(${table.demoUrl}) <= ${sql.raw(String(PROJECT_URL_MAX))}) AND (${table.websiteUrl} IS NULL OR length(${table.websiteUrl}) <= ${sql.raw(String(PROJECT_URL_MAX))})`,
    ),
    check(
      'projects_enum_check',
      sql`${table.stage} IN (${sql.raw(PROJECT_STAGES.map((stage) => `'${stage}'`).join(', '))}) AND ${table.status} IN (${sql.raw(PROJECT_STATUSES.map((status) => `'${status}'`).join(', '))})`,
    ),
    check('projects_version_check', sql`${table.version} >= 1`),
  ],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

/**
 * Who is on a project (B-PRJ-01): its owners, who edit and publish it, and its members. A member is
 * `listed` on the public page only once they confirmed it, so nobody is shown on a project they
 * did not agree to. A closed account leaves its projects; one left with nobody is deleted.
 */
export const projectMembers = sqliteTable(
  'project_members',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role', { enum: [...PROJECT_MEMBER_ROLES] })
      .notNull()
      .default('member'),
    isListed: integer('listed', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.userId] }),
    index('project_members_user_index').on(table.userId),
    check(
      'project_members_role_check',
      sql`${table.role} IN (${sql.raw(PROJECT_MEMBER_ROLES.map((role) => `'${role}'`).join(', '))})`,
    ),
  ],
);

export type ProjectMember = typeof projectMembers.$inferSelect;

/** Event RSVP — one per user per event (UNIQUE constraint). */
export const eventRsvps = sqliteTable(
  'event_rsvps',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status', { enum: [...RSVP_STATUSES] })
      .notNull()
      .default('going'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    eventIdUserIdUnique: uniqueIndex('event_rsvps_event_id_user_id_unique').on(
      t.eventId,
      t.userId,
    ),
    userIdIdx: index('event_rsvps_user_id_index').on(t.userId),
  }),
);

export type EventRsvp = typeof eventRsvps.$inferSelect;
export type NewEventRsvp = typeof eventRsvps.$inferInsert;

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  marketCode: text('market_code')
    .notNull()
    .references(() => markets.code),
  purpose: text('purpose', { enum: [...ORDER_PURPOSES] }).notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  payerUserId: text('payer_user_id').references(() => user.id),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency', { enum: [...CURRENCY_CODES] }).notNull(),
  status: text('status', { enum: [...ORDER_STATUSES] })
    .notNull()
    .default('pending'),
  provider: text('provider').notNull().default('manual'),
  providerRef: text('provider_ref'),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  paidAt: integer('paid_at', { mode: 'timestamp' }),
  cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
  refundedAt: integer('refunded_at', { mode: 'timestamp' }),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  number: text('number').notNull().unique(),
  billToName: text('bill_to_name').notNull(),
  billToEmail: text('bill_to_email').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency', { enum: [...CURRENCY_CODES] }).notNull(),
  notes: text('notes'),
  issuedAt: integer('issued_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

/**
 * Scheduled notification — one row per notification to send.
 * The Cron sweep (worker-jobs) reads the oldest `pending` rows where `send_at <= now`, dispatches
 * each on its channel, and resolves every one it selected. A retryable failure keeps the row
 * `pending` with `attempts` incremented and `send_at` deferred; the row goes terminally `failed`
 * once the attempt budget is spent or the provider reports a permanent error.
 *
 * `payload` is a JSON blob containing template-specific data (phone number,
 * event title, starts_at, locale, etc.) — the consumer parses it and renders
 * the SMS text or email HTML.
 *
 * `fallback_channel` names the channel to try once this row fails terminally. `fallback_of` points
 * the resulting row back at the one it replaces and is UNIQUE, so a parent can spawn at most one
 * fallback however many times the failure path runs.
 *
 * `cancelled` is terminal and distinct from `failed`: the notification was retired because the RSVP
 * or event went away, not because delivery did not work.
 *
 * `processing` is the in-flight claim. A sweep moves due rows into it atomically before dispatching
 * anything, so an overlapping sweep sees no rows left to take. `claimed_at` bounds that claim: an
 * invocation that dies mid-run leaves rows `processing` forever otherwise, and a later sweep
 * reclaims anything older than the claim timeout.
 *
 * `dispatch_started_at` separates the two ways a claim can be abandoned. Cleared on every
 * resolution and set immediately before the provider call, it is the only record that an outbound
 * message may already have been accepted. A reclaimed row with it unset never reached a provider
 * and is safe to retry; one with it set has an unknown outcome, and resending it is a duplicate
 * unless the channel can suppress one.
 */
export const scheduledNotifications = sqliteTable(
  'scheduled_notifications',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    channel: text('channel', { enum: [...NOTIFICATION_DELIVERY_CHANNELS] })
      .notNull()
      .default('sms'),
    status: text('status', { enum: [...NOTIFICATION_STATUSES] })
      .notNull()
      .default('pending'),
    templateKey: text('template_key', {
      enum: [...NOTIFICATION_TEMPLATE_KEYS],
    }).notNull(),
    payload: text('payload', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .notNull(),
    sendAt: integer('send_at', { mode: 'timestamp' }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    fallbackChannel: text('fallback_channel', {
      enum: [...NOTIFICATION_FALLBACK_CHANNELS],
    }),
    fallbackOf: text('fallback_of'),
    claimedAt: integer('claimed_at', { mode: 'timestamp' }),
    dispatchStartedAt: integer('dispatch_started_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    pendingIdx: index('idx_scheduled_notifications_pending')
      .on(t.sendAt)
      .where(sql`status = 'pending'`),
    eventIdIdx: index('scheduled_notifications_event_id_index').on(t.eventId),
    userIdIdx: index('scheduled_notifications_user_id_index').on(t.userId),
    fallbackOfUnique: uniqueIndex(
      'scheduled_notifications_fallback_of_unique',
    ).on(t.fallbackOf),
    processingIdx: index('idx_scheduled_notifications_processing')
      .on(t.claimedAt)
      .where(sql`status = 'processing'`),
  }),
);

export type ScheduledNotification = typeof scheduledNotifications.$inferSelect;
export type NewScheduledNotification =
  typeof scheduledNotifications.$inferInsert;

export const pushSubscriptions = sqliteTable(
  'push_subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    platform: text('platform', { enum: [...PUSH_PLATFORMS] }).notNull(),
    surface: text('surface', { enum: [...PUSH_SURFACES] }).notNull(),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('push_subscription_id_user_unique').on(table.id, table.userId),
  ],
);

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;

/**
 * City waitlist — anonymous demand capture for empty cities (FR-E6 "emptiness reads as invitation").
 * When a city has no upcoming meetup, a visitor can leave an email to hear when one is published.
 * The same email may wait for any number of cities, once per market and city, which the composite
 * unique index enforces. `notifiedAt` records the one notice the privacy policy promises; the entry
 * is deleted twelve months after it, by the daily retention sweep that reads the partial index.
 */
export const cityWaitlist = sqliteTable(
  'city_waitlist',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    cityCode: text('city_code').notNull(),
    locale: text('locale', { enum: [...LOCALES] }).notNull(),
    notifiedAt: integer('notified_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    emailCityUnique: uniqueIndex('city_waitlist_email_city_unique').on(
      t.email,
      t.marketCode,
      t.cityCode,
    ),
    cityCodeIdx: index('city_waitlist_city_code_index').on(
      t.marketCode,
      t.cityCode,
    ),
    notifiedIdx: index('city_waitlist_notified_index')
      .on(t.notifiedAt)
      .where(sql`notified_at IS NOT NULL`),
  }),
);

export type CityWaitlistRow = typeof cityWaitlist.$inferSelect;
export type NewCityWaitlist = typeof cityWaitlist.$inferInsert;

/**
 * An address asking to hear when the first hackathon's registration opens in a market (B-ANN-01).
 *
 * One row per address and market, like the city waitlist, and kept the same way: until the notice
 * goes out, then twelve months, so the partial index on `notified_at` is the one the daily
 * retention sweep reads through. No account is needed and none is linked; account closure deletes
 * the rows by address.
 */
export const hackathonInterest = sqliteTable(
  'hackathon_interest',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    locale: text('locale', { enum: [...LOCALES] }).notNull(),
    notifiedAt: integer('notified_at', { mode: 'timestamp' }),
    sendAttempts: integer('send_attempts').notNull().default(0),
    lastError: text('last_error'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex('hackathon_interest_email_market_unique').on(
      t.email,
      t.marketCode,
    ),
    index('hackathon_interest_notified_index')
      .on(t.notifiedAt)
      .where(sql`notified_at IS NOT NULL`),
    index('hackathon_interest_waiting_index')
      .on(t.marketCode, t.createdAt)
      .where(sql`notified_at IS NULL`),
  ],
);

export type HackathonInterestRow = typeof hackathonInterest.$inferSelect;

/**
 * The registration notice owed to a market's interest list (B-ANN-05), written when the market's
 * first hackathon is approved. At most one live or completed round per market, so only the first
 * hackathon to open registration there sends it; a round withdrawn because its hackathon will not
 * open leaves the market's list for the next.
 */
export const hackathonInterestLaunches = sqliteTable(
  'hackathon_interest_launches',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => hackathons.eventId, { onDelete: 'cascade' }),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    status: text('status', { enum: [...HACKATHON_INTEREST_LAUNCH_STATUSES] })
      .notNull()
      .default('pending'),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex('hackathon_interest_launch_event_unique').on(t.eventId),
    uniqueIndex('hackathon_interest_launch_market_unique')
      .on(t.marketCode)
      .where(sql`status != 'cancelled'`),
    index('hackathon_interest_launch_pending_index')
      .on(t.createdAt)
      .where(sql`status = 'pending'`),
  ],
);

export type HackathonInterestLaunchRow =
  typeof hackathonInterestLaunches.$inferSelect;

/**
 * One notice round: a published meetup telling its city's waitlist that it is coming up (#107).
 *
 * Written with the meetup, and only while somebody in that market and city is still waiting, so a
 * meetup in a city nobody waits for leaves no row and sends no message. The row is the durable half
 * of the queue message: the recovery sweep finds a round the message never reached. It is per
 * meetup, not per city, because the waitlist form comes back whenever a city has no upcoming
 * meetup, and whoever joins then is owed the next one.
 */
export const cityWaitlistLaunches = sqliteTable(
  'city_waitlist_launches',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    cityCode: text('city_code').notNull(),
    status: text('status', {
      enum: [...CITY_WAITLIST_LAUNCH_STATUSES],
    })
      .notNull()
      .default('pending'),
    cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    eventUnique: uniqueIndex('city_waitlist_launch_event_unique').on(t.eventId),
    pendingIdx: index('city_waitlist_launch_pending_index')
      .on(t.createdAt)
      .where(sql`status = 'pending'`),
  }),
);

export type CityWaitlistLaunchRow = typeof cityWaitlistLaunches.$inferSelect;
export type NewCityWaitlistLaunch = typeof cityWaitlistLaunches.$inferInsert;

/**
 * The outbox of a notice round: one row per waiting entry, claimed and sent one at a time.
 *
 * An entry holds at most one live or delivered notice across every round, so a person waiting for
 * a city is told once even when two meetups are published a minute apart. A notice that failed for
 * good, or whose meetup was cancelled first, frees the entry for the next meetup, and a round never
 * retries an entry it already gave up on.
 */
export const cityWaitlistNotifications = sqliteTable(
  'city_waitlist_notifications',
  {
    id: text('id').primaryKey(),
    launchId: text('launch_id')
      .notNull()
      .references(() => cityWaitlistLaunches.id, { onDelete: 'cascade' }),
    waitlistId: text('waitlist_id')
      .notNull()
      .references(() => cityWaitlist.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: [...CITY_WAITLIST_NOTIFICATION_STATUSES],
    })
      .notNull()
      .default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    nextAttemptAt: integer('next_attempt_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    claimedAt: integer('claimed_at', { mode: 'timestamp' }),
    dispatchStartedAt: integer('dispatch_started_at', { mode: 'timestamp' }),
    sentAt: integer('sent_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    liveUnique: uniqueIndex('city_waitlist_notification_live_unique')
      .on(t.waitlistId)
      .where(sql`status IN ('pending', 'processing', 'sent')`),
    roundUnique: uniqueIndex('city_waitlist_notification_round_unique').on(
      t.launchId,
      t.waitlistId,
    ),
    dueIdx: index('city_waitlist_notification_due_index').on(
      t.launchId,
      t.status,
      t.nextAttemptAt,
    ),
    claimedIdx: index('city_waitlist_notification_claimed_index')
      .on(t.launchId, t.claimedAt)
      .where(sql`status = 'processing'`),
  }),
);

export type CityWaitlistNotificationRow =
  typeof cityWaitlistNotifications.$inferSelect;
export type NewCityWaitlistNotification =
  typeof cityWaitlistNotifications.$inferInsert;

export const profileAssets = sqliteTable(
  'profile_assets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    objectKey: text('object_key').notNull().unique(),
    status: text('status', { enum: [...PROFILE_ASSET_STATUSES] })
      .notNull()
      .default('pending'),
    mimeType: text('mime_type', { enum: [...PROFILE_PHOTO_MIME_TYPES] }),
    byteSize: integer('byte_size'),
    width: integer('width'),
    height: integer('height'),
    revision: integer('revision').notNull().default(0),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('profile_asset_id_user_unique').on(table.id, table.userId),
    index('profile_assets_expiry_index').on(table.status, table.expiresAt),
  ],
);

export const memberProfiles = sqliteTable(
  'member_profiles',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    headline: text('headline'),
    stage: text('stage', { enum: [...PROFILE_STAGES] }),
    introduction: text('introduction'),
    interests: text('interests', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    spokenLanguages: text('spoken_languages', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    professionalLink: text('professional_link'),
    skills: text('skills', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    links: text('links', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    openTo: text('open_to', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    photoAssetId: text('photo_asset_id'),
    publishHeadline: integer('publish_headline', { mode: 'boolean' })
      .notNull()
      .default(false),
    publishStage: integer('publish_stage', { mode: 'boolean' })
      .notNull()
      .default(false),
    publishAttendedCount: integer('publish_attended_count', {
      mode: 'boolean',
    })
      .notNull()
      .default(false),
    publishInterests: integer('publish_interests', { mode: 'boolean' })
      .notNull()
      .default(false),
    publishSpokenLanguages: integer('publish_spoken_languages', {
      mode: 'boolean',
    })
      .notNull()
      .default(false),
    publishProfessionalLink: integer('publish_professional_link', {
      mode: 'boolean',
    })
      .notNull()
      .default(false),
    publishSkills: integer('publish_skills', { mode: 'boolean' })
      .notNull()
      .default(false),
    publishLinks: integer('publish_links', { mode: 'boolean' })
      .notNull()
      .default(false),
    publishOpenTo: integer('publish_open_to', { mode: 'boolean' })
      .notNull()
      .default(false),
    revision: integer('revision').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    foreignKey({
      columns: [table.photoAssetId, table.userId],
      foreignColumns: [profileAssets.id, profileAssets.userId],
    }),
  ],
);

export const accountPreferences = sqliteTable('account_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  eventUpdates: integer('event_updates', { mode: 'boolean' })
    .notNull()
    .default(true),
  eventUpdatesChannels: integer('event_updates_channels').notNull().default(5),
  eventReminders: integer('event_reminders', { mode: 'boolean' })
    .notNull()
    .default(true),
  eventRemindersChannels: integer('event_reminders_channels')
    .notNull()
    .default(5),
  hostRsvpReceived: integer('host_rsvp_received', { mode: 'boolean' })
    .notNull()
    .default(true),
  hostRsvpReceivedChannels: integer('host_rsvp_received_channels')
    .notNull()
    .default(5),
  hostRsvpCancelled: integer('host_rsvp_cancelled', { mode: 'boolean' })
    .notNull()
    .default(true),
  hostRsvpCancelledChannels: integer('host_rsvp_cancelled_channels')
    .notNull()
    .default(5),
  followUpPrompts: integer('follow_up_prompts', { mode: 'boolean' })
    .notNull()
    .default(true),
  followUpPromptsChannels: integer('follow_up_prompts_channels')
    .notNull()
    .default(4),
  meetupChat: integer('meetup_chat', { mode: 'boolean' })
    .notNull()
    .default(true),
  meetupChatChannels: integer('meetup_chat_channels').notNull().default(1),
  hackathons: integer('hackathons', { mode: 'boolean' })
    .notNull()
    .default(true),
  hackathonsChannels: integer('hackathons_channels').notNull().default(5),
  pushEnabled: integer('push_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  smsFallbackEnabled: integer('sms_fallback_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  smsConsentAt: integer('sms_consent_at', { mode: 'timestamp' }),
  revision: integer('revision').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const pushSessionLinks = sqliteTable(
  'push_session_links',
  {
    subscriptionId: text('subscription_id').primaryKey(),
    sessionId: text('session_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    foreignKey({
      columns: [table.subscriptionId, table.userId],
      foreignColumns: [pushSubscriptions.id, pushSubscriptions.userId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.sessionId, table.userId],
      foreignColumns: [session.id, session.userId],
    }).onDelete('cascade'),
    index('push_session_links_session_index').on(table.sessionId),
  ],
);

export type MemberProfileRow = typeof memberProfiles.$inferSelect;
export type ProfileAssetRow = typeof profileAssets.$inferSelect;
export type AccountPreferencesRow = typeof accountPreferences.$inferSelect;

/**
 * One row per event, written after it is over, saying whether it happened.
 *
 * Keyed by `event_id` rather than a generated id: an event has exactly one outcome, and a surrogate
 * key would permit two rows that disagree. Publication status stays where it is and keeps deciding
 * visibility — outcome and publication are separate fields deliberately, so a cancelled event and one that quietly did
 * not happen remain distinguishable.
 *
 * `version` is what makes a correction conditional. Two admins correcting the same closeout without
 * it is a last-write-wins race over evidence, which is the one kind of data this plan cannot let
 * drift.
 */
export const eventCloseouts = sqliteTable(
  'event_closeouts',
  {
    eventId: text('event_id')
      .primaryKey()
      .references(() => events.id, { onDelete: 'cascade' }),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    stateCode: text('state_code').notNull(),
    cityCode: text('city_code').notNull(),
    outcome: text('outcome', { enum: [...CLOSEOUT_OUTCOMES] }).notNull(),
    walkInCount: integer('walk_in_count').notNull().default(0),
    wouldHostAgain: integer('would_host_again', { mode: 'boolean' }),
    hostFriction: text('host_friction', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    privateNote: text('private_note'),
    submittedByUserId: text('submitted_by_user_id')
      .notNull()
      .references(() => user.id),
    submittedAt: integer('submitted_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedByUserId: text('updated_by_user_id').references(() => user.id),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    version: integer('version').notNull().default(0),
  },
  (table) => [
    index('event_closeouts_market_outcome_index').on(
      table.marketCode,
      table.outcome,
      table.submittedAt,
    ),
  ],
);

/**
 * One member's outcome for one event: they came, or they did not.
 *
 * `UNIQUE(event_id, user_id)` is the idempotency: a host marking the same person twice updates one
 * row rather than inflating a count. Attendance is kept separate from the RSVP so cancellation and
 * waitlist semantics stay intact — an attendance row is evidence about the past and an RSVP is
 * intent about the future, and overloading one with the other loses both.
 */
export const eventAttendance = sqliteTable(
  'event_attendance',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    stateCode: text('state_code').notNull(),
    cityCode: text('city_code').notNull(),
    outcome: text('outcome', { enum: [...ATTENDANCE_OUTCOMES] }).notNull(),
    recordedByUserId: text('recorded_by_user_id')
      .notNull()
      .references(() => user.id),
    recordedAt: integer('recorded_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('event_attendance_event_user_unique').on(
      table.eventId,
      table.userId,
    ),
    index('event_attendance_user_index').on(table.userId, table.recordedAt),
  ],
);

/**
 * The attendee pulse: one per member per event, updateable inside its window.
 *
 * `comment_language` is required alongside a comment and null without one. Member text is rendered
 * as authored and never translated, which is only possible if the language travelled with
 * it. The column is not a preference; it describes this string and nothing else.
 */
export const eventFeedback = sqliteTable(
  'event_feedback',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    stateCode: text('state_code').notNull(),
    cityCode: text('city_code').notNull(),
    valueRating: text('value_rating', {
      enum: [...FEEDBACK_RATINGS],
    }).notNull(),
    wouldReturn: integer('would_return', { mode: 'boolean' }).notNull(),
    comment: text('comment'),
    commentLanguage: text('comment_language', { enum: [...LOCALES] }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('event_feedback_event_user_unique').on(
      table.eventId,
      table.userId,
    ),
    index('event_feedback_event_index').on(table.eventId, table.createdAt),
  ],
);

/**
 * What a market has decided about one host.
 *
 * Unique per `(market_code, user_id)` and never global: a host restricted in one
 * market has not been restricted everywhere, and a global row would make that decision by accident
 * the first time the product opened a second market.
 */
export const hostTrust = sqliteTable(
  'host_trust',
  {
    id: text('id').primaryKey(),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    status: text('status', { enum: [...HOST_TRUST_STATUSES] })
      .notNull()
      .default('unreviewed'),
    reasonCode: text('reason_code', { enum: [...OPERATION_REASONS] }),
    reviewedByUserId: text('reviewed_by_user_id').references(() => user.id),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('host_trust_market_user_unique').on(
      table.marketCode,
      table.userId,
    ),
    index('host_trust_status_index').on(table.marketCode, table.status),
  ],
);

/**
 * Append-only. What was changed, by whom, and under which verified identity.
 *
 * Nothing updates or deletes a row here; the mutable tables serve reads and this stream explains
 * how they got that way. `access_subject` carries the verified Cloudflare Access subject and is
 * required for admin actions, so an operator's product session and their Access identity
 * are recorded together rather than either standing alone.
 *
 * `metadata` holds stable before/after values and no member PII: names, contacts and free text stay
 * out of anything that is read for analysis.
 */
export const operationsAudit = sqliteTable(
  'operations_audit',
  {
    id: text('id').primaryKey(),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => user.id),
    accessSubject: text('access_subject'),
    action: text('action', { enum: [...AUDIT_ACTIONS] }).notNull(),
    targetType: text('target_type', { enum: [...AUDIT_TARGETS] }).notNull(),
    targetId: text('target_id').notNull(),
    reasonCode: text('reason_code', { enum: [...OPERATION_REASONS] }),
    metadata: text('metadata', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'`),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('operations_audit_market_time_index').on(
      table.marketCode,
      table.createdAt,
    ),
    index('operations_audit_target_index').on(table.targetType, table.targetId),
  ],
);

/** One weekly decision, with the evidence window it was taken from. */
export const operationsReviews = sqliteTable(
  'operations_reviews',
  {
    id: text('id').primaryKey(),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    stateCode: text('state_code'),
    cityCode: text('city_code'),
    evidenceWindowStart: integer('evidence_window_start', {
      mode: 'timestamp',
    }).notNull(),
    evidenceWindowEnd: integer('evidence_window_end', {
      mode: 'timestamp',
    }).notNull(),
    bottleneck: text('bottleneck', { enum: [...REVIEW_BOTTLENECKS] }).notNull(),
    intervention: text('intervention').notNull(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => user.id),
    dueAt: integer('due_at', { mode: 'timestamp' }).notNull(),
    followUpResult: text('follow_up_result'),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('operations_reviews_market_window_index').on(
      table.marketCode,
      table.evidenceWindowStart,
    ),
  ],
);

/**
 * Monthly non-PII aggregates, which outlive the rows they were computed from.
 *
 * Closeouts, attendance and feedback retire after twenty-four months while these are kept
 * indefinitely, so the community's history survives its own retention policy. The unique key is the
 * whole identity of a measurement — market, scope, month, metric — so recomputing one overwrites
 * rather than accumulating a second answer for the same question.
 */
export const communityMetricSnapshots = sqliteTable(
  'community_metric_snapshots',
  {
    id: text('id').primaryKey(),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    scopeType: text('scope_type', { enum: [...OPERATIONS_SCOPES] }).notNull(),
    scopeCode: text('scope_code').notNull(),
    periodMonth: text('period_month').notNull(),
    metricKey: text('metric_key', { enum: [...METRIC_KEYS] }).notNull(),
    numerator: integer('numerator').notNull(),
    denominator: integer('denominator'),
    computedAt: integer('computed_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('community_metric_snapshots_identity_unique').on(
      table.marketCode,
      table.scopeType,
      table.scopeCode,
      table.periodMonth,
      table.metricKey,
    ),
  ],
);

export type EventCloseoutRow = typeof eventCloseouts.$inferSelect;
export type EventAttendanceRow = typeof eventAttendance.$inferSelect;
export type EventFeedbackRow = typeof eventFeedback.$inferSelect;
export type HostTrustRow = typeof hostTrust.$inferSelect;
export type OperationsAuditRow = typeof operationsAudit.$inferSelect;
export type OperationsReviewRow = typeof operationsReviews.$inferSelect;
export type CommunityMetricSnapshotRow =
  typeof communityMetricSnapshots.$inferSelect;

/**
 * A meetup's chat (P1-026): one per meetup, written in the same batch as the meetup.
 *
 * `read_only_at` and `expires_at` are derived from the meetup's row by the lifetime expressions in
 * `chat-channels.ts`, in the batch of every write that can move them: publishing, an edit and a
 * cancellation. The chat takes messages until `read_only_at`, seven days after the meetup ends or
 * the moment it is cancelled, and is deleted with its messages at `expires_at`, 90 days after
 * either, by a retention sweep that reads the index. `kind` names the one kind there is, `meetup`,
 * so a city channel can come later without a second table.
 */
export const chatChannels = sqliteTable(
  'chat_channels',
  {
    id: text('id').primaryKey(),
    kind: text('kind', { enum: [...CHAT_CHANNEL_KINDS] })
      .notNull()
      .default('meetup'),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    readOnlyAt: integer('read_only_at', { mode: 'timestamp' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('chat_channels_event_id_unique').on(table.eventId),
    index('chat_channels_expires_at_index').on(table.expiresAt),
  ],
);

/**
 * One message in a meetup's chat (P1-026).
 *
 * A member's message is `text`, its `body` one normalised line. A `system` message has no author
 * and no body: `system_key` and `system_params` name what happened, so each member reads it in
 * their own language. Removing a message empties its body and records when, by whom and in which
 * role, and the tombstone keeps its place in the chat.
 *
 * `client_id` is the id the sender's device gave the message, unique with its chat and author, so a
 * send retried after a lost answer writes once, and an id a device reuses in another chat is a new
 * message there. `created_at` is in milliseconds, since several messages in one second are common,
 * and orders the chat with `id` as the tie-break the index carries.
 * Authors' names and photos are joined when a chat is read, never copied here, so a changed name or
 * a closed account reads correctly in every message at once.
 */
export const chatMessages = sqliteTable(
  'chat_messages',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id')
      .notNull()
      .references(() => chatChannels.id, { onDelete: 'cascade' }),
    authorId: text('author_id').references(() => user.id, {
      onDelete: 'cascade',
    }),
    kind: text('kind', { enum: [...CHAT_MESSAGE_KINDS] })
      .notNull()
      .default('text'),
    body: text('body').notNull().default(''),
    systemKey: text('system_key'),
    systemParams: text('system_params', { mode: 'json' }).$type<
      Record<string, string>
    >(),
    clientId: text('client_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    removedAt: integer('removed_at', { mode: 'timestamp_ms' }),
    removedBy: text('removed_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    removal: text('removal', { enum: [...CHAT_MESSAGE_REMOVALS] }),
  },
  (table) => [
    index('chat_messages_channel_created_index').on(
      table.channelId,
      table.createdAt,
      table.id,
    ),
    uniqueIndex('chat_messages_channel_author_client_unique').on(
      table.channelId,
      table.authorId,
      table.clientId,
    ),
  ],
);

/**
 * What a member of a meetup's chat chose for it (P1-026): how far they have read, and whether they
 * muted it.
 *
 * Membership itself is not stored. The host and everyone going are members because the meetup and
 * its RSVPs say so, which is how everyone going joins without a write and how a cancelled RSVP
 * leaves at once. A row appears the first time a member reads the chat or mutes it.
 * `last_read_at` is in milliseconds, the unit of the messages it is compared with.
 */
export const chatMembers = sqliteTable(
  'chat_members',
  {
    channelId: text('channel_id')
      .notNull()
      .references(() => chatChannels.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lastReadAt: integer('last_read_at', { mode: 'timestamp_ms' }),
    muted: integer('muted', { mode: 'boolean' }).notNull().default(false),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    primaryKey({ columns: [table.channelId, table.userId] }),
    index('chat_members_user_id_index').on(table.userId),
  ],
);

/**
 * A member's report of a message in a meetup's chat, for a moderator to act on (P1-026).
 *
 * `message_id` is deliberately not a foreign key: a report outlives its message, which its author
 * or the host may remove and the retention sweep deletes with its chat, and it keeps no copy of the
 * text. It keeps who wrote the message, `reported_user_id`, so a member reported again and again
 * still shows once their chats are gone. A decided report is deleted 24 months after its
 * `reviewed_at`, through the partial index on it; an open one waits for its decision.
 * `market_code` scopes the review queue to the market. A member reports a message once, and the
 * reporter is never shown to its author or to the host.
 */
export const chatReports = sqliteTable(
  'chat_reports',
  {
    id: text('id').primaryKey(),
    messageId: text('message_id').notNull(),
    reporterId: text('reporter_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    reportedUserId: text('reported_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    marketCode: text('market_code')
      .notNull()
      .references(() => markets.code),
    reason: text('reason', { enum: [...CHAT_REPORT_REASONS] }).notNull(),
    status: text('status', { enum: [...CHAT_REPORT_STATUSES] })
      .notNull()
      .default('open'),
    reviewedBy: text('reviewed_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('chat_reports_message_reporter_unique').on(
      table.messageId,
      table.reporterId,
    ),
    index('chat_reports_market_status_index').on(
      table.marketCode,
      table.status,
      table.createdAt,
    ),
    index('chat_reports_created_at_index').on(table.createdAt),
    index('chat_reports_reporter_id_index').on(table.reporterId),
    index('chat_reports_reviewed_at_index')
      .on(table.reviewedAt)
      .where(sql`reviewed_at IS NOT NULL`),
  ],
);

export type ChatChannelRow = typeof chatChannels.$inferSelect;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type ChatMemberRow = typeof chatMembers.$inferSelect;
export type ChatReportRow = typeof chatReports.$inferSelect;
