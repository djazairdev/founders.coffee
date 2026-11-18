import type { Db } from './db.js';
import { batch } from './atomic.js';
import { markets, organization } from './schema.js';
import type { NewMarket, NewOrganization } from './schema.js';

export const SEED_MARKETS: readonly NewMarket[] = [
  {
    code: 'DZ',
    name: 'Algeria',
    nameAr: 'الجزائر',
    nameFr: 'Algérie',
    slug: 'algeria',
    defaultLocale: 'ar',
    defaultCurrency: 'DZD',
    timezone: 'Africa/Algiers',
    direction: 'rtl',
    state: 'active',
    featureFlags: {
      events: true,
      hackathons: false,
      payments: false,
      recruiting: false,
      communityOperations: true,
      meetupChat: true,
    },
  },
  {
    code: 'EG',
    name: 'Egypt',
    nameAr: 'مصر',
    nameFr: 'Égypte',
    slug: 'egypt',
    defaultLocale: 'ar',
    defaultCurrency: 'EGP',
    timezone: 'Africa/Cairo',
    direction: 'rtl',
    state: 'active',
    featureFlags: {
      events: true,
      hackathons: false,
      payments: false,
      recruiting: false,
      communityOperations: true,
      meetupChat: true,
    },
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    nameAr: 'السعودية',
    nameFr: 'Arabie saoudite',
    slug: 'saudi-arabia',
    defaultLocale: 'ar',
    defaultCurrency: 'SAR',
    timezone: 'Asia/Riyadh',
    direction: 'rtl',
    state: 'active',
    featureFlags: {
      events: true,
      hackathons: false,
      payments: false,
      recruiting: false,
      communityOperations: true,
      meetupChat: true,
    },
  },
];

export const PLATFORM_ORGANISATION: NewOrganization = {
  id: 'org_founders_coffee',
  name: 'founders.coffee',
  slug: 'founders-coffee',
  kind: 'platform',
  status: 'approved',
  marketCode: 'DZ',
  description:
    'founders.coffee runs free meetups and hackathons for founders and builders.',
  websiteUrl: 'https://founders.coffee',
};

/**
 * Idempotently seed launch markets into D1, then the platform organisation that leads the events
 * *Hosted by founders.coffee* (B-ORG-07). `ON CONFLICT DO NOTHING` — safe to re-run.
 * Runs in one atomic `db.batch()` round-trip (AGENTS.md §11).
 */
export const seed = async (db: Db): Promise<void> => {
  await batch(db, [
    ...SEED_MARKETS.map((market) =>
      db.insert(markets).values(market).onConflictDoNothing(),
    ),
    db.insert(organization).values(PLATFORM_ORGANISATION).onConflictDoNothing(),
  ]);
};
