import { LOCALES } from '@founders-coffee/i18n';

export const PRIVATE_SCREENS = [
  'login',
  'onboarding',
  'profile',
  'profile/account',
  'profile/activity',
  'profile/notifications',
  'u/usr_1',
  'closeout/evt_1',
  'feedback/evt_1',
  'edit/evt_1',
  'algeria/host/create',
];

export const LOCALE_ONLY_PRIVATE_SCREENS = [
  'hackathon/evt_1/manage',
  'hackathon/evt_1/team',
  'hackathon/evt_1/submit',
  'hackathon/evt_1/judge',
  'o/apply',
  'o/invitations/inv_1',
  'o/acme/manage',
];

export const PRIVATE_SCREENS_IN_EVERY_LANGUAGE = LOCALES.flatMap((locale) =>
  [...PRIVATE_SCREENS, ...LOCALE_ONLY_PRIVATE_SCREENS].map(
    (screen) => `/${locale}/${screen}`,
  ),
);

export const PRIVATE_SCREEN_STUBS = [
  ...PRIVATE_SCREENS.map((screen) => `/${screen}`),
  '/account',
  '/activity',
  '/preferences',
];

export const PRIVATE_SCREEN_VARIANTS = [
  '/PROFILE',
  '/en/PROFILE',
  '/fr/Feedback/evt_1',
  '/algeria/profile',
  '/EN/profile',
  '/algeria/u/usr_1',
  '/en/%70rofile',
  '/%70rofile',
  '/en/%75/usr_1',
  '/%65n/profile',
  '/fr/%46eedback/evt_1',
  '/en/%50ROFILE',
  '/ar/%6C%6F%67%69%6E',
  '/algeria/%70rofile',
  '/%61ccount',
  '/fr/algeria/host/%63reate',
  '/algeria%2Fx/profile',
  '//profile',
  '//en/profile',
  '/en//profile',
  '/en/login%20',
  '/algeria/hackathon/evt_1/judge',
  '/en/HACKATHON/evt_1/Submit',
  '/fr/hackathon/evt_1/%6Danage',
  '/algeria/o/acme/manage',
  '/en/O/Apply',
  '/ar/o/%61pply',
];

export const PUBLIC_PAGES_NAMING_A_SCREEN = [
  '/ar/algeria/profile',
  '/en/algeria/e/feedback',
  '/en/algeria/e/closeout',
  '/ar/algeria/e/edit',
  '/fr/algeria/e/login',
  '/en/algeria/e/profile',
  '/en/e/feedback',
  '/en/algeria/e/%70rofile',
  '/fr/algeria/e/%6Cogin',
  '/ar/algeria/%70rofile',
  '/en/e/%66eedback',
  '/en/o/acme',
  '/ar/o/apply-club',
  '/fr/algeria/e/hackathon',
  '/en/e/o',
];
