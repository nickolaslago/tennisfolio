import { useSearchParams } from 'react-router-dom'

/**
 * Reads/writes a fixed set of string filter values straight from the URL
 * query string, so filtered list views stay shareable via link.
 */
export function useUrlFilters(keys: readonly string[]) {
  const [searchParams, setSearchParams] = useSearchParams()

  const values: Record<string, string> = {}
  for (const key of keys) {
    values[key] = searchParams.get(key) ?? ''
  }

  const setValue = (key: string, value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const removeValue = (key: string) => setValue(key, '')

  return { values, setValue, removeValue }
}
