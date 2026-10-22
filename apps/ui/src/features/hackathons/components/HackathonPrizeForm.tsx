import {
  hackathon_details_saving,
  hackathon_prize_cancel,
  hackathon_prize_clears_confirmation,
  hackathon_prize_description,
  hackathon_prize_for,
  hackathon_prize_overall,
  hackathon_prize_place,
  hackathon_prize_place_hint,
  hackathon_prize_provider,
  hackathon_prize_save,
  hackathon_prize_title,
  hackathon_prize_value,
  hackathon_prize_value_hint,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import {
  Button,
  fieldNoteId,
  FormField,
  Input,
  Select,
  StatusMessage,
} from '@founders-coffee/ui';

import type { HackathonTrackView } from '../api';
import {
  PRIZE_PLACE_MAX,
  prizeFieldId,
  type PrizeField,
} from '../hackathon-prize-form';
import type { useHackathonPrizes } from '../useHackathonPrizes';

export const HackathonPrizeForm = ({
  form,
  formKey,
  tracks,
  currency,
  isConfirmed,
  locale,
}: {
  form: ReturnType<typeof useHackathonPrizes>;
  formKey: string;
  tracks: readonly HackathonTrackView[];
  currency: string;
  isConfirmed: boolean;
  locale: Locale;
}) => {
  const options = { locale };
  const idOf = (field: PrizeField) => prizeFieldId(formKey, field);
  const described = (field: PrizeField, hint = false) => ({
    'aria-invalid': form.errors[field] ? true : undefined,
    'aria-describedby':
      form.errors[field] || hint ? fieldNoteId(idOf(field)) : undefined,
  });
  return (
    <form
      noValidate
      className="grid gap-4 rounded-box border border-base-300 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.save();
      }}
    >
      {isConfirmed ? (
        <StatusMessage variant="info">
          {hackathon_prize_clears_confirmation({}, options)}
        </StatusMessage>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <FormField
          id={idOf('trackId')}
          label={hackathon_prize_for({}, options)}
          optionalLabel={optional({}, options)}
        >
          <Select
            id={idOf('trackId')}
            value={form.values.trackId}
            onChange={(event) => form.set('trackId')(event.target.value)}
          >
            <option value="">{hackathon_prize_overall({}, options)}</option>
            {tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.title}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id={idOf('place')}
          label={hackathon_prize_place({}, options)}
          optionalLabel={optional({}, options)}
          hint={hackathon_prize_place_hint({ max: PRIZE_PLACE_MAX }, options)}
          error={form.errors.place}
        >
          <Input
            id={idOf('place')}
            inputMode="numeric"
            dir="ltr"
            value={form.values.place}
            {...described('place', true)}
            onChange={(event) => form.set('place')(event.target.value)}
          />
        </FormField>
      </div>
      <FormField
        id={idOf('title')}
        label={hackathon_prize_title({}, options)}
        optionalLabel={optional({}, options)}
        error={form.errors.title}
      >
        <Input
          id={idOf('title')}
          dir="auto"
          maxLength={100}
          value={form.values.title}
          {...described('title')}
          onChange={(event) => form.set('title')(event.target.value)}
        />
      </FormField>
      <FormField
        id={idOf('description')}
        label={hackathon_prize_description({}, options)}
        optionalLabel={optional({}, options)}
        error={form.errors.description}
      >
        <textarea
          id={idOf('description')}
          className="textarea textarea-sm md:textarea-md w-full"
          rows={3}
          dir="auto"
          maxLength={1000}
          value={form.values.description}
          {...described('description')}
          onChange={(event) => form.set('description')(event.target.value)}
        />
      </FormField>
      <FormField
        id={idOf('providerName')}
        label={hackathon_prize_provider({}, options)}
        optionalLabel={optional({}, options)}
        error={form.errors.providerName}
      >
        <Input
          id={idOf('providerName')}
          dir="auto"
          maxLength={100}
          value={form.values.providerName}
          {...described('providerName')}
          onChange={(event) => form.set('providerName')(event.target.value)}
        />
      </FormField>
      <FormField
        id={idOf('value')}
        label={hackathon_prize_value({ currency }, options)}
        isOptional
        optionalLabel={optional({}, options)}
        hint={hackathon_prize_value_hint({}, options)}
        error={form.errors.value}
      >
        <Input
          id={idOf('value')}
          inputMode="decimal"
          dir="ltr"
          value={form.values.value}
          {...described('value', true)}
          onChange={(event) => form.set('value')(event.target.value)}
        />
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={form.isBusy}>
          {form.isBusy
            ? hackathon_details_saving({}, options)
            : hackathon_prize_save({}, options)}
        </Button>
        <Button variant="ghost" disabled={form.isBusy} onClick={form.close}>
          {hackathon_prize_cancel({}, options)}
        </Button>
      </div>
    </form>
  );
};
