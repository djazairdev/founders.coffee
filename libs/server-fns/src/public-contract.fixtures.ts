import { getTableColumns } from 'drizzle-orm';

import { user } from '@founders-coffee/db';

export const PUBLIC_PROFILE_FIELDS = [
  'displayName',
  'headline',
  'indexable',
  'interests',
  'introduction',
  'links',
  'memberSince',
  'openTo',
  'photoAssetId',
  'skills',
  'spokenLanguages',
  'stage',
  'userId',
] as const;

export const OWNER_PROFILE_FIELDS = [
  ...PUBLIC_PROFILE_FIELDS,
  'revision',
  'visibility',
] as const;

export const MEETUP_RECORD_FIELDS = ['attendedCount', 'hostedCount'] as const;
export const HACKATHON_FIELDS = ['hackathonRecord', 'projects'] as const;

export const EVENT_COLUMNS = [
  'cancellationReason',
  'cancelledAt',
  'cityCode',
  'createdAt',
  'description',
  'endsAt',
  'format',
  'hackathonFields',
  'hackathonTypeTags',
  'hostId',
  'id',
  'kind',
  'language',
  'languages',
  'latitude',
  'longitude',
  'marketCode',
  'meetingUrl',
  'rsvps',
  'slug',
  'startsAt',
  'stateCode',
  'status',
  'tags',
  'title',
  'updatedAt',
  'venue',
  'venueAddress',
  'version',
] as const;

export const PUBLIC_EVENT_FIELDS = [
  ...EVENT_COLUMNS.filter((column) => column !== 'meetingUrl'),
  'cityName',
  'cityNameAr',
  'cityNameFr',
  'citySlug',
  'goingCount',
  'hostName',
  'hostPhotoAssetId',
  'organisations',
  'runBy',
  'viewerRsvp',
] as const;

export const PUBLIC_CITY_HOST_FIELDS = ['name', 'photoAssetId'] as const;

export const PUBLIC_MARKET_FIELDS = [
  'brandOverrides',
  'code',
  'createdAt',
  'defaultCurrency',
  'defaultLocale',
  'direction',
  'featureFlags',
  'name',
  'nameAr',
  'nameFr',
  'slug',
  'state',
  'timezone',
] as const;

const GENERIC_IDENTITY_COLUMNS = ['createdAt', 'id', 'name', 'updatedAt'];

export const IDENTITY_COLUMNS_NEVER_PUBLISHED = Object.keys(
  getTableColumns(user),
).filter((column) => !GENERIC_IDENTITY_COLUMNS.includes(column));
