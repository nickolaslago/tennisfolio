/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Overrides the API base URL; defaults to the relative `/api` path proxied by nginx (Docker) or Vite (dev). */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
