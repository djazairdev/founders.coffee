import type {
  HackathonReportReason,
  HackathonReportTarget,
} from '@founders-coffee/core';
import {
  admin_rpt_target_submission,
  admin_rpt_target_team,
  hackathon_report_reason_harassment,
  hackathon_report_reason_other,
  hackathon_report_reason_plagiarism,
  hackathon_report_reason_rule_breaking,
  hackathon_report_reason_spam,
} from '@founders-coffee/i18n';

type Message = typeof admin_rpt_target_team;

export const REPORT_REASON_LABELS: Record<HackathonReportReason, Message> = {
  plagiarism: hackathon_report_reason_plagiarism,
  rule_breaking: hackathon_report_reason_rule_breaking,
  harassment: hackathon_report_reason_harassment,
  spam: hackathon_report_reason_spam,
  other: hackathon_report_reason_other,
};

export const REPORT_TARGET_LABELS: Record<HackathonReportTarget, Message> = {
  submission: admin_rpt_target_submission,
  team: admin_rpt_target_team,
};
