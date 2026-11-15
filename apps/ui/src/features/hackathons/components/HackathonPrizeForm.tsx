import {
  hackathon_details_saving,
  hackathon_prize_cancel,
  hackathon_prize_clears_confirmation,
  hackathon_prize_description,
  hackathon_prize_description_ph,
  hackathon_prize_place,
  hackathon_prize_place_ph,
  hackathon_prize_provider,
  hackathon_prize_save,
  hackathon_prize_sponsor_heading,
  hackathon_prize_sponsor_hint,
  hackathon_prize_title,
  hackathon_prize_title_ph,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import {
  Button,
  fieldNoteId,
  FormField,
  Input,
  Select,
} from '@founders-coffee/ui';

import { useFocusFirstField } from '../../../lib/useFocusFirstField';
import {
  PRIZE_PLACE_MAX,
  prizeFieldId,
  prizePlaceLabel,
  type PrizeField,
} from '../hackathon-prize-form';
import type { useHackathonPrizes } from '../useHackathonPrizes';
import { HackathonSaveButton } from './HackathonSaveButton';

export const HackathonPrizeForm = ({
  form,
  formKey,
  isConfirmed,
  locale,
}: {
  form: ReturnType<typeof useHackathonPrizes>;
  formKey: string;
  isConfirmed: boolean;
  locale: Locale;
}) => {
  const options = { locale };
  const isSponsorDetailsVisible =
    form.isProviderRequired || form.values.providerName !== '';
  const idOf = (field: PrizeField) => prizeFieldId(formKey, field);
  const described = (field: PrizeField, hint = false) => ({
    'aria-invalid': form.errors[field] ? true : undefined,
    'aria-describedby':
      form.errors[field] || hint ? fieldNoteId(idOf(field)) : undefined,
  });
  const firstField = useFocusFirstField();
  return (
    <form
      ref={firstField}
      noValidate
      className="grid gap-4 rounded-box border border-base-300 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.save();
      }}
    >
      {isConfirmed ? (
        <p className="text-body-sm text-neutral">
          {hackathon_prize_clears_confirmation({}, options)}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <FormField
          id={idOf('place')}
          label={hackathon_prize_place({}, options)}
          optionalLabel={optional({}, options)}
          error={form.errors.place}
        >
          <Select
            id={idOf('place')}
            value={form.values.place}
            {...described('place')}
            onChange={(event) => form.set('place')(event.target.value)}
          >
            <option value="">{hackathon_prize_place_ph({}, options)}</option>
            {Array.from({ length: PRIZE_PLACE_MAX }, (_, index) => index + 1).map(
              (place) => (
                <option key={place} value={place}>
                  {prizePlaceLabel(place, locale)}
                </option>
              ),
            )}
          </Select>
        </FormField>
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
            placeholder={hackathon_prize_title_ph({}, options)}
            value={form.values.title}
            {...described('title')}
            onChange={(event) => form.set('title')(event.target.value)}
          />
        </FormField>
      </div>
      <FormField
        id={idOf('description')}
        label={hackathon_prize_description({}, options)}
        isOptional
        optionalLabel={optional({}, options)}
        error={form.errors.description}
      >
        <textarea
          id={idOf('description')}
          className="textarea textarea-sm md:textarea-md w-full"
          rows={2}
          dir="auto"
          maxLength={1000}
          placeholder={hackathon_prize_description_ph({}, options)}
          value={form.values.description}
          {...described('description')}
          onChange={(event) => form.set('description')(event.target.value)}
        />
      </FormField>
      {isSponsorDetailsVisible ? (
        <div className="grid gap-3 rounded-box bg-base-200 p-3">
          <p className="text-label">
            {hackathon_prize_sponsor_heading({}, options)}
          </p>
          <FormField
            id={idOf('providerName')}
            label={hackathon_prize_provider({}, options)}
            isOptional={!form.isProviderRequired}
            optionalLabel={optional({}, options)}
            hint={hackathon_prize_sponsor_hint({}, options)}
            error={form.errors.providerName}
          >
            <Input
              id={idOf('providerName')}
              dir="auto"
              maxLength={100}
              value={form.values.providerName}
              {...described('providerName', true)}
              onChange={(event) =>
                form.set('providerName')(event.target.value)
              }
            />
          </FormField>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <HackathonSaveButton type="submit" isBusy={form.isBusy}>
          {form.isBusy
            ? hackathon_details_saving({}, options)
            : hackathon_prize_save({}, options)}
        </HackathonSaveButton>
        <Button variant="ghost" isBusy={form.isBusy} onClick={form.close}>
          {hackathon_prize_cancel({}, options)}
        </Button>
      </div>
    </form>
  );
};
