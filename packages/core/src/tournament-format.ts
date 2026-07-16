/**
 * Tournament match formats offered in the tournament format dropdown.
 *
 * These are the *named* presets shown in the `<Select>`; the form also offers a
 * "Custom" option that reveals a free-text field. Whichever value is chosen is
 * written to the tournament's `format` column as a plain string — the column
 * stays free-text `String(80)`, so legacy values outside this list stay valid.
 */
export const TOURNAMENT_FORMAT_OPTIONS = [
  'Best of 3',
  'Best of 5',
  '1 Set',
  'Tie Break',
  'Super Tie Break',
] as const

export type TournamentFormat = (typeof TOURNAMENT_FORMAT_OPTIONS)[number]

/** Whether a stored format string matches one of the named presets. */
export function isTournamentFormat(value: string): value is TournamentFormat {
  return (TOURNAMENT_FORMAT_OPTIONS as readonly string[]).includes(value)
}
