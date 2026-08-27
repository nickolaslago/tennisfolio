/**
 * One forward-only schema step.
 *
 * There are deliberately no `down` migrations: a phone cannot roll back to a
 * previously-installed binary, so a reversal would only ever run in a
 * development build. Fixing a bad migration means shipping the next version.
 */
export interface Migration {
  /** 1-based, contiguous, and never reordered once released. */
  version: number;
  /** Human-readable slug, recorded in `schema_migrations` for debugging. */
  name: string;
  /** Statements applied in order, all inside one transaction. */
  statements: string[];
}
