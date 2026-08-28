/**
 * The error shape screens see, wherever their data came from.
 *
 * `apps/web` throws `ApiError(status, message, details)` from
 * `src/lib/api/errors.ts`. The repositories throw the same triple, with the
 * same HTTP status codes the API would have returned, so error handling
 * (`error.status === 404`, field errors off `details`) written against one
 * client works against the other. There is no network here — the status code is
 * a shared vocabulary for "not found" / "conflict" / "unprocessable", not a
 * claim that a request was made.
 */

export interface RepositoryErrorDetail {
  [key: string]: unknown;
}

export class RepositoryError extends Error {
  readonly status: number;
  readonly details: RepositoryErrorDetail[] | null;

  constructor(status: number, message: string, details: RepositoryErrorDetail[] | null = null) {
    super(message);
    this.name = 'RepositoryError';
    this.status = status;
    this.details = details;
  }
}

/** 404 — mirrors the API's `get_or_404`, message included. */
export function notFound(resourceName: string, id: string): RepositoryError {
  return new RepositoryError(404, `${resourceName} ${id} not found`);
}

/** 409 — a write the schema refuses, e.g. deleting an opponent that has matches. */
export function conflict(message: string): RepositoryError {
  return new RepositoryError(409, message);
}

/** 422 — a well-formed payload that does not describe a legal domain object. */
export function unprocessable(message: string): RepositoryError {
  return new RepositoryError(422, message);
}

/**
 * Mirrors `AbortSignal` support in the web client so a React Query `queryFn`
 * can be written once. Local reads are fast enough that this only ever fires
 * before the work starts.
 */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new RepositoryError(499, 'Request aborted');
  }
}
