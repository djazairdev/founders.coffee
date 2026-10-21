import { emailProviderFromEnv } from '../email-from-env.js';
import { createDecisionNotice } from './organisation-decision-email.js';

/** The decision email's sender for this request. Called only inside handlers. */
export const decisionNoticeFromEnv = () =>
  createDecisionNotice(emailProviderFromEnv());
