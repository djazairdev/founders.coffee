import { useState } from 'react';

import { appErrorCode } from '@founders-coffee/core';
import {
  hackathon_prize_delivery_assign,
  hackathon_prize_delivery_assigned,
  hackathon_prize_delivery_delivered,
  hackathon_prize_delivery_entry_unavailable,
  hackathon_prize_delivery_failed,
  hackathon_prize_delivery_heading,
  hackathon_prize_delivery_holder,
  hackathon_prize_delivery_none,
  hackathon_prize_delivery_note,
  hackathon_prize_delivery_note_hint,
  hackathon_prize_delivery_save,
  hackathon_prize_delivery_saved,
  hackathon_prize_delivery_status,
  hackathon_prize_delivery_status_pending,
  hackathon_prize_delivery_status_received,
  hackathon_prize_delivery_status_sent,
  hackathon_results_page_disqualified,
  type Locale,
} from '@founders-coffee/i18n';
import { Button } from '@founders-coffee/ui';

import type { PrizeDeliveryView } from '../api';
import type { HackathonFeedback } from '../hackathon-feedback';
import {
  useAssignPrize,
  usePrizeDelivery,
  useSetPrizeDelivery,
} from '../results-hooks';
import { HackathonSaveButton } from './HackathonSaveButton';

type Status = NonNullable<PrizeDeliveryView['prizes'][number]['status']>;

const STATUS = {
  pending: hackathon_prize_delivery_status_pending,
  sent: hackathon_prize_delivery_status_sent,
  received: hackathon_prize_delivery_status_received,
};

const STATUSES = Object.keys(STATUS) as Status[];

const failureOf = (error: unknown, locale: Locale): string => {
  const options = { locale };
  const code = appErrorCode(error);
  if (code === 'prize_delivered')
    return hackathon_prize_delivery_delivered({}, options);
  if (code === 'prize_entry_unavailable')
    return hackathon_prize_delivery_entry_unavailable({}, options);
  return hackathon_prize_delivery_failed({}, options);
};

const PrizeRow = ({
  eventId,
  prize,
  entries,
  locale,
  onFeedback,
}: {
  eventId: string;
  prize: PrizeDeliveryView['prizes'][number];
  entries: PrizeDeliveryView['entries'];
  locale: Locale;
  onFeedback: HackathonFeedback;
}) => {
  const options = { locale };
  const assign = useAssignPrize(eventId);
  const deliver = useSetPrizeDelivery(eventId);
  const [submissionId, setSubmissionId] = useState(prize.submissionId ?? '');
  const [status, setStatus] = useState<Status>(prize.status ?? 'pending');
  const [note, setNote] = useState(prize.note ?? '');
  const isReceived = prize.status === 'received';
  return (
    <li className="rounded-box border border-base-300 p-4">
      <p className="font-medium break-words">
        <bdi>{prize.title}</bdi>
        {prize.trackTitle ? (
          <span className="text-body-sm font-normal text-neutral">
            {' · '}
            <bdi>{prize.trackTitle}</bdi>
          </span>
        ) : null}
      </p>
      <label
        className="mt-3 block text-body-sm font-medium"
        htmlFor={`prize-holder-${prize.prizeId}`}
      >
        {hackathon_prize_delivery_holder({}, options)}
      </label>
      <select
        id={`prize-holder-${prize.prizeId}`}
        className="select select-sm mt-1 w-full md:select-md"
        value={submissionId}
        disabled={isReceived || assign.isPending}
        onChange={(event) => setSubmissionId(event.target.value)}
      >
        <option value="">{hackathon_prize_delivery_none({}, options)}</option>
        {entries.map((entry) => (
          <option
            key={entry.submissionId}
            value={entry.submissionId}
            disabled={entry.isDisqualified}
          >
            {entry.teamName} · {entry.title}
            {entry.isDisqualified
              ? ` · ${hackathon_results_page_disqualified({}, options)}`
              : ''}
          </option>
        ))}
      </select>
      <Button
        variant="outline"
        className="mt-2"
        disabled={isReceived}
        isBusy={
          assign.isPending ||
          !submissionId ||
          submissionId === prize.submissionId
        }
        onClick={() =>
          assign.mutate(
            { eventId, prizeId: prize.prizeId, submissionId },
            {
              onSuccess: () =>
                onFeedback(
                  hackathon_prize_delivery_assigned({}, options),
                  'success',
                ),
              onError: (error: unknown) =>
                onFeedback(failureOf(error, locale), 'error'),
            },
          )
        }
      >
        {hackathon_prize_delivery_assign({}, options)}
      </Button>
      {prize.submissionId ? (
        <div className="mt-4">
          <label
            className="block text-body-sm font-medium"
            htmlFor={`prize-status-${prize.prizeId}`}
          >
            {hackathon_prize_delivery_status({}, options)}
          </label>
          <select
            id={`prize-status-${prize.prizeId}`}
            className="select select-sm mt-1 w-full md:select-md"
            value={status}
            onChange={(event) => setStatus(event.target.value as Status)}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS[value]({}, options)}
              </option>
            ))}
          </select>
          <label
            className="mt-3 block text-body-sm font-medium"
            htmlFor={`prize-note-${prize.prizeId}`}
          >
            {hackathon_prize_delivery_note({}, options)}
          </label>
          <p className="text-caption text-neutral">
            {hackathon_prize_delivery_note_hint({}, options)}
          </p>
          <textarea
            id={`prize-note-${prize.prizeId}`}
            className="textarea textarea-sm mt-1 w-full md:textarea-md"
            dir="auto"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <HackathonSaveButton
            className="mt-2"
            isBusy={deliver.isPending}
            onClick={() =>
              deliver.mutate(
                {
                  eventId,
                  prizeId: prize.prizeId,
                  status,
                  note,
                },
                {
                  onSuccess: () =>
                    onFeedback(
                      hackathon_prize_delivery_saved({}, options),
                      'success',
                    ),
                  onError: (error: unknown) =>
                    onFeedback(failureOf(error, locale), 'error'),
                },
              )
            }
          >
            {hackathon_prize_delivery_save({}, options)}
          </HackathonSaveButton>
        </div>
      ) : null}
    </li>
  );
};

export const HackathonPrizeDelivery = ({
  eventId,
  locale,
  onFeedback,
}: {
  eventId: string;
  locale: Locale;
  onFeedback: HackathonFeedback;
}) => {
  const { data } = usePrizeDelivery(eventId);
  if (!data?.isOpen || data.prizes.length === 0) return null;
  return (
    <section
      aria-labelledby="hackathon-prize-delivery-heading"
      className="mt-8"
    >
      <h2
        id="hackathon-prize-delivery-heading"
        className="font-display text-h4"
      >
        {hackathon_prize_delivery_heading({}, { locale })}
      </h2>
      <ul className="mt-3 grid gap-3">
        {data.prizes.map((prize) => (
          <PrizeRow
            key={`${prize.prizeId}:${prize.submissionId ?? ''}:${prize.status ?? ''}`}
            eventId={eventId}
            prize={prize}
            entries={data.entries}
            locale={locale}
            onFeedback={onFeedback}
          />
        ))}
      </ul>
    </section>
  );
};
