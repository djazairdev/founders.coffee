import {
  admin_cohost_role_co_host,
  admin_cohost_role_lead,
  admin_org_status_approved,
  admin_org_status_pending,
  admin_org_status_rejected,
  admin_org_status_suspended,
  type Locale,
} from '@founders-coffee/i18n';
import type {
  EventOrganiserRole,
  OrganisationStatus,
} from '@founders-coffee/core';

const ROLES: Record<EventOrganiserRole, typeof admin_cohost_role_lead> = {
  lead: admin_cohost_role_lead,
  co_host: admin_cohost_role_co_host,
};

const STATUSES: Record<OrganisationStatus, typeof admin_org_status_approved> = {
  pending: admin_org_status_pending,
  approved: admin_org_status_approved,
  rejected: admin_org_status_rejected,
  suspended: admin_org_status_suspended,
};

/** An organiser's role in the event, in the operator's language. */
export const roleLabel = (role: EventOrganiserRole, locale: Locale): string =>
  ROLES[role]({}, { locale });

/** An organisation's status, in the operator's language. */
export const statusLabel = (
  status: OrganisationStatus,
  locale: Locale,
): string => STATUSES[status]({}, { locale });
