import { useTable, type ColumnDef, type RowData } from '@tanstack/react-table';

import {
  formatNumber,
  hackathon_table_next,
  hackathon_table_page,
  hackathon_table_previous,
  type Locale,
} from '@founders-coffee/i18n';
import { Button } from '@founders-coffee/ui';

import {
  ORGANISER_TABLE_FEATURES,
  ORGANISER_TABLE_PAGE_SIZE,
} from '../organiser-table';

export const HackathonOrganiserTable = <TData extends RowData>({
  columns,
  data,
  headingId,
  locale,
}: {
  columns: ReadonlyArray<ColumnDef<typeof ORGANISER_TABLE_FEATURES, TData>>;
  data: readonly TData[];
  headingId: string;
  locale: Locale;
}) => {
  const options = { locale };
  const table = useTable({
    features: ORGANISER_TABLE_FEATURES,
    columns,
    data,
    initialState: {
      pagination: { pageIndex: 0, pageSize: ORGANISER_TABLE_PAGE_SIZE },
    },
  });
  const pageCount = table.getPageCount();
  return (
    <div className="mt-3 grid gap-3">
      <div
        role="group"
        aria-labelledby={headingId}
        tabIndex={0}
        className="overflow-x-auto rounded-box border border-base-300"
      >
        <table className="table table-sm">
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
                    <table.FlexRender cell={cell} />
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
            isBusy={!table.getCanPreviousPage()}
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
            isBusy={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            {hackathon_table_next({}, options)}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
