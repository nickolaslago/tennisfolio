/** Mirrors apps/api's schemas/common.py Page[ItemT] envelope. */
export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface ListParams {
  limit?: number
  offset?: number
  search?: string
  [key: string]: string | number | boolean | undefined
}
