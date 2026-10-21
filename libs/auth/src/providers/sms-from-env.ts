import {
  DevSmsProvider,
  TwilioVerifySmsProvider,
  type SmsProvider,
} from './sms.js';

/**
 * Build an SmsProvider from auth env vars. Returns `DevSmsProvider` when Twilio
 * env vars are absent (dev + tests) or `TwilioVerifySmsProvider` when all three
 * vars are present.
 */
export const smsProviderFromEnv = (env: {
  TWILIO_SID?: string;
  TWILIO_AID?: string;
  TWILIO_SEC?: string;
}): SmsProvider => {
  if (env.TWILIO_SID && env.TWILIO_AID && env.TWILIO_SEC) {
    return new TwilioVerifySmsProvider({
      TWILIO_SID: env.TWILIO_SID,
      TWILIO_AID: env.TWILIO_AID,
      TWILIO_SEC: env.TWILIO_SEC,
    });
  }
  return new DevSmsProvider();
};
