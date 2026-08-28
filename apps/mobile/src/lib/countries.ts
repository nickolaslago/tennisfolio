import { COUNTRY_NAMES } from '@tennisfolio/core';

import type { SelectOption } from '@/components/form';

/** `COUNTRY_NAMES` as `SelectField` options — the mobile counterpart of web's `CountryCombobox`. */
export const COUNTRY_OPTIONS: SelectOption[] = COUNTRY_NAMES.map((country) => ({
  value: country,
  label: country,
}));
