import { createAuthClient as createBetterAuthClient } from 'better-auth/client';
import {
  adminClient,
  emailOTPClient,
  organizationClient,
  phoneNumberClient,
} from 'better-auth/client/plugins';

/**
 * Frontend auth client. Consumed by apps' `features/<domain>/api.ts` + hooks
 * (TanStack Query). Passwordless phone-OTP + email-OTP + admin (RBAC) +
 * organisation client plugins mirror the server config. The organisation
 * plugin's HTTP paths are disabled on the server, so it contributes types only:
 * organisers are reached through our server functions.
 */
export const createAuthClient = (opts?: { baseURL?: string }) =>
  createBetterAuthClient({
    ...(opts?.baseURL ? { baseURL: opts.baseURL } : {}),
    plugins: [
      emailOTPClient(),
      phoneNumberClient(),
      adminClient(),
      organizationClient({ teams: { enabled: false } }),
    ],
  });

export type AuthClient = ReturnType<typeof createAuthClient>;
