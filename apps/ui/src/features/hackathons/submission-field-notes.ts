import { fieldNoteId } from '@founders-coffee/ui';

/** Tie a project field to its note, the error when it has one, or else its hint. */
export const noted = (
  id: string,
  error: string | undefined,
  hasHint = false,
) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error || hasHint ? fieldNoteId(id) : undefined,
});
