import { createColumnHelper, useTable } from '@tanstack/react-table';
import { Building2, Pencil, Plus, Settings, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';

import {
  formatNumber,
  hackathon_create,
  hackathon_table_next,
  hackathon_table_page,
  hackathon_table_previous,
  org_page_manage,
  org_profile_actions,
  org_profile_delete,
  org_profile_edit,
  org_profile_role,
  org_profile_status,
  org_role_admin,
  org_role_member,
  org_role_owner,
  org_status_approved,
  org_status_pending,
  org_status_rejected,
  org_status_suspended,
  profile_organisations,
  profile_organisations_title,
  type Locale,
} from '@founders-coffee/i18n';
import { Button } from '@founders-coffee/ui';

import type { OrganisationView } from '../api';
import { localizedHackathonCreate } from '../../../lib/locale-routing';
import {
  ORGANISATION_TABLE_FEATURES,
  ORGANISATION_TABLE_PAGE_SIZE,
} from '../organisation-table';

const columnsFor = (
  locale: Locale,
  onEdit: (organisation: OrganisationView) => void,
  onDelete: (organisation: OrganisationView) => void,
) => {
  const options = { locale };
  const helper = createColumnHelper<
    typeof ORGANISATION_TABLE_FEATURES,
    OrganisationView
  >();
  return helper.columns([
    helper.accessor('name', {
      header: () => profile_organisations({}, options),
      cell: (name) => {
        const organisation = name.row.original;
        return (
          <div className="flex min-w-52 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-box bg-base-200 text-base-content">
              {organisation.logo ? (
                <img
                  className="size-full object-cover"
                  src={organisation.logo}
                  alt=""
                  width={44}
                  height={44}
                />
              ) : (
                <Building2 className="size-5" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <bdi className="block break-words font-medium">
                {name.getValue()}
              </bdi>
              <bdi className="block break-all text-caption text-neutral">
                /{organisation.slug}
              </bdi>
            </div>
          </div>
        );
      },
    }),
    helper.accessor('role', {
      header: () => org_profile_role({}, options),
      cell: (role) => roleLabel(role.getValue(), locale),
    }),
    helper.accessor('status', {
      header: () => org_profile_status({}, options),
      cell: (status) => statusLabel(status.getValue(), locale),
    }),
    helper.accessor('id', {
      header: () => org_profile_actions({}, options),
      cell: (id) => {
        const organisation = id.row.original;
        return (
          <div className="flex min-w-max items-center gap-2">
            {organisation.status === 'approved' ? (
              <Link
                {...localizedHackathonCreate(locale, organisation.slug)}
                className="btn btn-outline btn-xs whitespace-nowrap sm:btn-sm md:btn-md"
              >
                <Plus className="size-4" aria-hidden="true" />
                {hackathon_create({}, options)}
              </Link>
            ) : null}
            {organisation.canEdit ? (
              <Button
                variant="outline"
                className="btn-circle"
                aria-label={org_profile_edit({}, options)}
                title={org_profile_edit({}, options)}
                onClick={() => onEdit(organisation)}
              >
                <Pencil className="size-4" aria-hidden="true" />
              </Button>
            ) : null}
            <Link
              to="/$locale/o/$slug/manage"
              params={{ locale, slug: organisation.slug }}
              aria-label={org_page_manage({}, options)}
              title={org_page_manage({}, options)}
              className="btn btn-outline btn-circle btn-xs sm:btn-sm md:btn-md"
            >
              <Settings className="size-4" aria-hidden="true" />
            </Link>
            {organisation.canDelete ? (
              <Button
                variant="outline"
                className="btn-circle text-error"
                aria-label={org_profile_delete({}, options)}
                title={org_profile_delete({}, options)}
                onClick={() => onDelete(organisation)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        );
      },
    }),
  ]);
};

const roleLabel = (role: string, locale: Locale) => {
  const options = { locale };
  const first = role.split(',')[0]?.trim();
  if (first === 'owner') return org_role_owner({}, options);
  if (first === 'admin') return org_role_admin({}, options);
  return org_role_member({}, options);
};

const statusLabel = (status: OrganisationView['status'], locale: Locale) => {
  const options = { locale };
  if (status === 'approved') return org_status_approved({}, options);
  if (status === 'pending') return org_status_pending({}, options);
  if (status === 'rejected') return org_status_rejected({}, options);
  return org_status_suspended({}, options);
};

const statusClass = (status: OrganisationView['status']) => {
  if (status === 'approved') return 'badge-success';
  if (status === 'pending') return 'badge-warning';
  return 'badge-error';
};

export const OrganisationListTable = ({
  data,
  locale,
  onEdit,
  onDelete,
}: {
  data: readonly OrganisationView[];
  locale: Locale;
  onEdit: (organisation: OrganisationView) => void;
  onDelete: (organisation: OrganisationView) => void;
}) => {
  const options = { locale };
  const columns = useMemo(
    () => columnsFor(locale, onEdit, onDelete),
    [locale, onEdit, onDelete],
  );
  const table = useTable({
    features: ORGANISATION_TABLE_FEATURES,
    columns,
    data,
    initialState: {
      pagination: { pageIndex: 0, pageSize: ORGANISATION_TABLE_PAGE_SIZE },
    },
  });
  const pageCount = table.getPageCount();
  return (
    <div className="grid gap-3">
      <div
        role="group"
        aria-label={profile_organisations_title({}, options)}
        tabIndex={0}
        className="overflow-x-auto rounded-box border border-base-300"
      >
        <table className="table table-zebra table-sm">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} scope="col" className="whitespace-nowrap">
                    <table.FlexRender header={header} />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id}>
                    {cell.column.id === 'status' ? (
                      <span
                        className={`badge badge-soft ${statusClass(row.original.status)}`}
                      >
                        <table.FlexRender cell={cell} />
                      </span>
                    ) : (
                      <table.FlexRender cell={cell} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            {hackathon_table_previous({}, options)}
          </Button>
          <p className="text-body-sm text-neutral" aria-live="polite">
            {hackathon_table_page(
              {
                page: formatNumber(
                  table.state.pagination.pageIndex + 1,
                  locale,
                ),
                total: formatNumber(pageCount, locale),
              },
              options,
            )}
          </p>
          <Button
            variant="outline"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            {hackathon_table_next({}, options)}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export { ORGANISATION_TABLE_PAGE_SIZE };
