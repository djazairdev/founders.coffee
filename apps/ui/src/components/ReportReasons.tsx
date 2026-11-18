import { useId } from 'react';

export const ReportReasons = <Reason extends string>({
  legend,
  reasons,
  value,
  isDisabled,
  onChange,
}: {
  legend: string;
  reasons: readonly { readonly value: Reason; readonly label: string }[];
  value: Reason | null;
  isDisabled: boolean;
  onChange: (reason: Reason) => void;
}) => {
  const name = useId();

  return (
    <fieldset className="mt-4" disabled={isDisabled}>
      <legend className="mb-1 text-label text-neutral">{legend}</legend>
      {reasons.map((reason) => (
        <label
          key={reason.value}
          className="flex min-h-11 cursor-pointer items-center gap-3"
        >
          <input
            type="radio"
            className="radio radio-primary shrink-0"
            name={name}
            value={reason.value}
            checked={value === reason.value}
            onChange={() => onChange(reason.value)}
          />
          <span className="text-body">{reason.label}</span>
        </label>
      ))}
    </fieldset>
  );
};
