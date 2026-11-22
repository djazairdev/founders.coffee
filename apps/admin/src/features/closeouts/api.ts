import {
  createAdminMissingCloseout,
  listAdminMissingCloseouts,
} from '@founders-coffee/server-fns/admin';
import type {
  AdminMissingCloseouts,
  CreateMissingCloseoutRequest,
} from '@founders-coffee/server-fns/admin';
export type {
  CreateMissingCloseoutRequest,
  MissingCloseoutItem,
} from '@founders-coffee/server-fns/admin';

export const missingCloseoutsApi = {
  list: (): Promise<AdminMissingCloseouts> =>
    listAdminMissingCloseouts({ data: {} }),
  create: (request: CreateMissingCloseoutRequest) =>
    createAdminMissingCloseout({ data: request }),
};
