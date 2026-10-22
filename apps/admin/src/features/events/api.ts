import {
  addEventCoHostOrganisation,
  getEventCoHosts,
  removeEventCoHostOrganisation,
} from '@founders-coffee/server-fns/admin';
import type {
  EventCoHostChangeRequest,
  EventCoHosts,
} from '@founders-coffee/server-fns/admin';

export type { EventCoHostChangeRequest, EventCoHosts };

export const eventCoHostsApi = {
  find: (reference: string): Promise<EventCoHosts> =>
    getEventCoHosts({ data: { reference } }),
  add: (request: EventCoHostChangeRequest): Promise<EventCoHosts> =>
    addEventCoHostOrganisation({ data: request }),
  remove: (request: EventCoHostChangeRequest): Promise<EventCoHosts> =>
    removeEventCoHostOrganisation({ data: request }),
};
