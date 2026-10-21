export const QueueFilter = <Value extends string>({
  label,
  options,
  active,
  onSelect,
}: {
  label: string;
  options: readonly { value: Value; label: string }[];
  active: Value;
  onSelect: (value: Value) => void;
}) => (
  <div aria-label={label} className="flex flex-wrap gap-1.5" role="group">
    {options.map((option) => (
      <button
        aria-pressed={option.value === active}
        className={
          option.value === active
            ? 'btn btn-primary btn-xs sm:btn-sm md:btn-md'
            : 'btn btn-ghost btn-xs sm:btn-sm md:btn-md'
        }
        key={option.value}
        onClick={() => onSelect(option.value)}
        type="button"
      >
        {option.label}
      </button>
    ))}
  </div>
);
