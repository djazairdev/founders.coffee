export const QueuePager = ({
  page,
  hasMore,
  previousLabel,
  nextLabel,
  onPage,
}: {
  page: number;
  hasMore: boolean;
  previousLabel: string;
  nextLabel: string;
  onPage: (page: number) => void;
}) => {
  if (page === 0 && !hasMore) return null;
  return (
    <nav className="flex justify-between gap-2">
      <button
        className="btn btn-ghost btn-xs sm:btn-sm md:btn-md"
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
        type="button"
      >
        {previousLabel}
      </button>
      <button
        className="btn btn-ghost btn-xs sm:btn-sm md:btn-md"
        disabled={!hasMore}
        onClick={() => onPage(page + 1)}
        type="button"
      >
        {nextLabel}
      </button>
    </nav>
  );
};
