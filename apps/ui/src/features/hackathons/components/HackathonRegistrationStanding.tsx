import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';

import type { AttendanceMode } from '@founders-coffee/core';
import {
  hackathon_registered,
  hackathon_waitlisted,
  hackathon_withdraw,
  hackathon_withdraw_confirm,
  hackathon_withdraw_keep,
  hackathon_withdraw_waitlist,
  hackathon_withdraw_yes,
  type Locale,
} from '@founders-coffee/i18n';
import { Badge, StatusMessage } from '@founders-coffee/ui';

import { ATTENDANCE_LABELS } from '../detail-labels';
import { registrationErrorMessage } from '../registration-errors';
import { useWithdrawFromHackathon } from '../registration-hooks';

const CONFIRM_ID = 'hackathon-withdraw-confirm';

export const HackathonRegistrationStanding = ({
  eventId,
  status,
  attendanceMode,
  canWithdraw,
  locale,
}: {
  eventId: string;
  status: 'registered' | 'waitlisted';
  attendanceMode: AttendanceMode;
  canWithdraw: boolean;
  locale: Locale;
}) => {
  const options = { locale };
  const router = useRouter();
  const withdraw = useWithdrawFromHackathon();
  const [isConfirming, setIsConfirming] = useState(false);
  const isRegistered = status === 'registered';

  const confirm = () =>
    withdraw.mutate(eventId, {
      onSuccess: () => void router.invalidate(),
      onSettled: () => setIsConfirming(false),
    });

  return (
    <div className="grid gap-3">
      <p className="text-body-sm font-medium">
        {isRegistered
          ? hackathon_registered({}, options)
          : hackathon_waitlisted({}, options)}
      </p>
      <div>
        <Badge variant="outline" size="sm">
          {ATTENDANCE_LABELS[attendanceMode]({}, options)}
        </Badge>
      </div>
      {withdraw.isError ? (
        <StatusMessage variant="error">
          {registrationErrorMessage(withdraw.error, locale)}
        </StatusMessage>
      ) : null}
      {canWithdraw && isConfirming ? (
        <div role="group" aria-labelledby={CONFIRM_ID} className="grid gap-2">
          <p id={CONFIRM_ID} className="text-body-sm text-neutral">
            {hackathon_withdraw_confirm({}, options)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-error btn-outline btn-xs sm:btn-sm md:btn-md"
              onClick={confirm}
              disabled={withdraw.isPending}
            >
              {hackathon_withdraw_yes({}, options)}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-xs sm:btn-sm md:btn-md"
              onClick={() => setIsConfirming(false)}
              disabled={withdraw.isPending}
            >
              {hackathon_withdraw_keep({}, options)}
            </button>
          </div>
        </div>
      ) : canWithdraw ? (
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-xs sm:btn-sm md:btn-md"
            onClick={() => setIsConfirming(true)}
          >
            {isRegistered
              ? hackathon_withdraw({}, options)
              : hackathon_withdraw_waitlist({}, options)}
          </button>
        </div>
      ) : null}
    </div>
  );
};
