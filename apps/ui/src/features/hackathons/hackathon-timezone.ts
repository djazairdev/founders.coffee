export const utcOffsetAt = (timeZone: string, epochMs: number): string => {
  const name = new Intl.DateTimeFormat('en', {
    timeZone,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(new Date(epochMs))
    .find((part) => part.type === 'timeZoneName')?.value;
  const offset = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(name ?? '');
  if (!offset) return 'UTC+0';
  const [, sign, hours, minutes] = offset;
  return `UTC${sign}${Number(hours)}${minutes && minutes !== '00' ? `:${minutes}` : ''}`;
};

export const isolateBidi = (value: string): string => `\u2068${value}\u2069`;
