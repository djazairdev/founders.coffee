import {
  CHAT_REPORT_REASONS,
  type ChatReportReason,
} from '@founders-coffee/core';
import {
  chat_report_harassment,
  chat_report_other,
  chat_report_reason,
  chat_report_spam,
  type Locale,
} from '@founders-coffee/i18n';

import { ReportReasons } from '../../../components/ReportReasons';

type ChatReportReasonsProps = {
  locale: Locale;
  value: ChatReportReason | null;
  isDisabled: boolean;
  onChange: (reason: ChatReportReason) => void;
};

const LABELS = {
  spam: chat_report_spam,
  harassment: chat_report_harassment,
  other: chat_report_other,
} as const satisfies Record<ChatReportReason, unknown>;

export const ChatReportReasons = ({
  locale,
  value,
  isDisabled,
  onChange,
}: ChatReportReasonsProps) => (
  <ReportReasons
    legend={chat_report_reason({}, { locale })}
    reasons={CHAT_REPORT_REASONS.map((reason) => ({
      value: reason,
      label: LABELS[reason]({}, { locale }),
    }))}
    value={value}
    isDisabled={isDisabled}
    onChange={onChange}
  />
);
