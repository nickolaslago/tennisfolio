/** Mirrors apps/api's uniform error envelope: every non-2xx response is `{"error": {"message", "details"}}`. */
export interface ApiErrorDetail {
  [key: string]: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly details: ApiErrorDetail[] | null

  constructor(status: number, message: string, details: ApiErrorDetail[] | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}
