import { ApiError } from './errors'

// Defaults to the relative `/api` path, proxied to the FastAPI service by
// nginx in Docker Compose (apps/web/nginx.conf) and by Vite in local dev
// (server.proxy in vite.config.ts). Override with VITE_API_BASE_URL to point
// at a different host entirely.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

type QueryParams = Record<string, string | number | boolean | undefined>

interface RequestOptions {
  params?: QueryParams
  signal?: AbortSignal
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

interface ErrorEnvelope {
  error: { message: string; details: ApiError['details'] }
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions & { body?: unknown } = {},
): Promise<T> {
  const { params, body, signal } = options

  const res = await fetch(buildUrl(path, params), {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  if (res.status === 204) return undefined as T

  const payload: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const envelope = payload as Partial<ErrorEnvelope> | null
    throw new ApiError(
      res.status,
      envelope?.error?.message ?? res.statusText,
      envelope?.error?.details ?? null,
    )
  }

  return payload as T
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T = void>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}
