import { ApiError } from './errors'

/**
 * Maps a 422 validation `ApiError` to `{ field: message }`, keyed by the last
 * segment of each error's `loc` (FastAPI's `["body", "field_name"]` shape).
 * Non-field errors (network failures, 409s, etc.) fall through — callers show
 * those as a top-level banner instead.
 */
export function fieldErrorsFromApiError(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.details) return {}
  const fields: Record<string, string> = {}
  for (const detail of error.details) {
    const loc = detail.loc
    const msg = detail.msg
    if (!Array.isArray(loc) || typeof msg !== 'string') continue
    const field = loc[loc.length - 1]
    if (typeof field === 'string') fields[field] = msg
  }
  return fields
}

/** True when the error carries no field-level detail worth mapping — show it as a banner instead. */
export function isBannerError(error: unknown): boolean {
  return error instanceof Error && Object.keys(fieldErrorsFromApiError(error)).length === 0
}
