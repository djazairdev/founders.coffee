import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { appErrorCode } from '@founders-coffee/core';
import {
  admin_hkn_email_dialog_title,
  admin_hkn_email_failed,
  admin_hkn_email_recipient,
  admin_hkn_email_send,
  admin_hkn_email_sending,
  admin_hkn_email_sent,
  admin_hkn_email_template,
  admin_hkn_email_template_draft_reminder,
  admin_hkn_email_template_hackathon_outreach,
  admin_hkn_email_unavailable,
  cancel,
  rate_limited,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { HackathonDraftEmailRequest } from '../api';
import { useSendHackathonDraftEmail } from '../hooks';

const sendFailureOf = (error: unknown, locale: Locale): string => {
  const options = { locale };
  switch (appErrorCode(error)) {
    case 'rate_limited':
      return rate_limited({}, options);
    case 'email_unavailable':
      return admin_hkn_email_unavailable({}, options);
    default:
      return admin_hkn_email_failed({}, options);
  }
};

export const HackathonDraftEmailDialog = ({
  eventId,
  creatorEmail,
  locale,
  onClose,
}: {
  eventId: string;
  creatorEmail: string;
  locale: Locale;
  onClose: () => void;
}) => {
  const options = { locale };
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [recipient, setRecipient] = useState(creatorEmail);
  const [template, setTemplate] = useState<
    HackathonDraftEmailRequest['template']
  >('draft-completion-reminder');
  const [isSent, setIsSent] = useState(false);
  const sendEmail = useSendHackathonDraftEmail();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendEmail.isPending || isSent) return;
    sendEmail.mutate(
      {
        eventId,
        template,
        recipient,
        locale,
      },
      { onSuccess: () => setIsSent(true) },
    );
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <div className="modal-box max-w-lg rounded-box border border-base-300 bg-base-100">
        <h2 id={titleId} className="font-display text-h4 font-semibold">
          {admin_hkn_email_dialog_title({}, options)}
        </h2>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <label
              className="text-body-sm font-medium"
              htmlFor={`${titleId}-template`}
            >
              {admin_hkn_email_template({}, options)}
            </label>
            <select
              id={`${titleId}-template`}
              className="select select-sm md:select-md w-full"
              value={template}
              disabled={sendEmail.isPending || isSent}
              onChange={(event) =>
                setTemplate(
                  event.currentTarget
                    .value as HackathonDraftEmailRequest['template'],
                )
              }
            >
              <option value="draft-completion-reminder">
                {admin_hkn_email_template_draft_reminder({}, options)}
              </option>
              <option value="hackathon-outreach">
                {admin_hkn_email_template_hackathon_outreach({}, options)}
              </option>
            </select>
          </div>
          <div className="space-y-2">
            <label
              className="text-body-sm font-medium"
              htmlFor={`${titleId}-recipient`}
            >
              {admin_hkn_email_recipient({}, options)}
            </label>
            <input
              id={`${titleId}-recipient`}
              className="input input-sm md:input-md w-full"
              type="email"
              dir="ltr"
              autoComplete="email"
              required
              maxLength={254}
              value={recipient}
              disabled={sendEmail.isPending || isSent}
              onChange={(event) => setRecipient(event.currentTarget.value)}
            />
          </div>
          {sendEmail.isError ? (
            <StatusMessage variant="error">
              {sendFailureOf(sendEmail.error, locale)}
            </StatusMessage>
          ) : null}
          {isSent ? (
            <StatusMessage variant="success">
              {admin_hkn_email_sent({}, options)}
            </StatusMessage>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              disabled={sendEmail.isPending}
              onClick={() => dialogRef.current?.close()}
            >
              {cancel({}, options)}
            </Button>
            <Button
              type="submit"
              variant="primary"
              isBusy={sendEmail.isPending}
              disabled={sendEmail.isPending || isSent}
            >
              {sendEmail.isPending
                ? admin_hkn_email_sending({}, options)
                : admin_hkn_email_send({}, options)}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
