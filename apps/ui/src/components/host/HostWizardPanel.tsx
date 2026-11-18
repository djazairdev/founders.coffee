import type { ReactNode, RefObject } from 'react';

import type { Locale } from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import {
  TOTAL_STEPS,
  type useHostCreateWizard,
} from '../../features/events/useHostCreateWizard';
import type { SocialProvider } from '../auth/SocialSignIn';
import { HostIdentityGate } from './HostIdentityGate';

type HostWizardPanelProps = {
  locale: Locale;
  wizard: ReturnType<typeof useHostCreateWizard>;
  scrollRef: RefObject<HTMLDivElement | null>;
  turnstileSiteKey: string | null;
  isTurnstileBypassed: boolean;
  socialProviders: readonly SocialProvider[];
  children: ReactNode;
};

export const HostWizardPanel = ({
  locale,
  wizard,
  scrollRef,
  turnstileSiteKey,
  isTurnstileBypassed,
  socialProviders,
  children,
}: HostWizardPanelProps) => (
  <section className="host-fade-up relative flex min-h-0 flex-col border-base-300 bg-base-100 lg:col-start-1 lg:row-start-2 lg:border-e">
    <div
      ref={scrollRef}
      className={`flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3 pb-4 lg:gap-4 lg:overflow-y-auto lg:px-7 lg:pt-5 lg:pb-7 ${
        wizard.step === 1 && !wizard.isRepeat ? 'max-lg:py-0' : ''
      }`}
    >
      {wizard.isAuthGateOpen ? (
        <>
          {wizard.publishError && (
            <StatusMessage variant="error">{wizard.publishError}</StatusMessage>
          )}
          <HostIdentityGate
            needsReauthentication={wizard.needsReauthentication}
            locale={locale}
            turnstileSiteKey={turnstileSiteKey}
            isTurnstileBypassed={isTurnstileBypassed}
            socialProviders={socialProviders}
            onCancel={wizard.closeAuthGate}
            onAuthenticated={wizard.onGateAuthenticated}
          />
        </>
      ) : (
        children
      )}
    </div>

    {!wizard.isAuthGateOpen &&
      wizard.step === TOTAL_STEPS &&
      wizard.publishError && (
        <div className="flex flex-col gap-2 border-t border-base-300 px-4 pt-3 lg:px-7 lg:pt-4">
          <StatusMessage variant="error">{wizard.publishError}</StatusMessage>
        </div>
      )}
  </section>
);
