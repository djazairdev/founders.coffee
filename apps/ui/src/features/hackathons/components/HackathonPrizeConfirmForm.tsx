import {
  hackathon_details_saving,
  hackathon_prize_cancel,
  hackathon_prize_confirm,
  hackathon_prize_note,
  hackathon_prize_note_hint,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, fieldNoteId, FormField } from '@founders-coffee/ui';

import { NOTE_MAX } from '../hackathon-prize-form';
import { prizeNoteId, type useHackathonPrizes } from '../useHackathonPrizes';

export const HackathonPrizeConfirmForm = ({
  form,
  prizeId,
  locale,
}: {
  form: ReturnType<typeof useHackathonPrizes>;
  prizeId: string;
  locale: Locale;
}) => {
  const options = { locale };
  const noteId = prizeNoteId(prizeId);
  return (
    <form
      noValidate
      className="grid gap-4 rounded-box border border-base-300 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.record();
      }}
    >
      <FormField
        id={noteId}
        label={hackathon_prize_note({}, options)}
        optionalLabel={optional({}, options)}
        hint={hackathon_prize_note_hint({}, options)}
        error={form.noteError ?? undefined}
      >
        <textarea
          id={noteId}
          className="textarea textarea-sm md:textarea-md w-full"
          rows={3}
          dir="auto"
          maxLength={NOTE_MAX}
          value={form.note}
          aria-invalid={form.noteError ? true : undefined}
          aria-describedby={fieldNoteId(noteId)}
          onChange={(event) => form.setNote(event.target.value)}
        />
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={form.isBusy}>
          {form.isBusy
            ? hackathon_details_saving({}, options)
            : hackathon_prize_confirm({}, options)}
        </Button>
        <Button
          variant="ghost"
          disabled={form.isBusy}
          onClick={form.closeConfirm}
        >
          {hackathon_prize_cancel({}, options)}
        </Button>
      </div>
    </form>
  );
};
