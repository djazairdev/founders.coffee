import {
  createPaginatedRowModel,
  rowPaginationFeature,
  tableFeatures,
} from '@tanstack/react-table';

export const ORGANISATION_TABLE_FEATURES = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

export const ORGANISATION_TABLE_PAGE_SIZE = 10;
