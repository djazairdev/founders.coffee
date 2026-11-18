import {
  createPaginatedRowModel,
  rowPaginationFeature,
  tableFeatures,
} from '@tanstack/react-table';

export const ORGANISER_TABLE_FEATURES = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

export const ORGANISER_TABLE_PAGE_SIZE = 25;
