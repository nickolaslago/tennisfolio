import { useSyncExternalStore } from 'react'

function subscribe(query: string) {
  return (onChange: () => void) => {
    const media = window.matchMedia(query)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }
}

/** Tracks whether a media query currently matches, updating live as the viewport changes. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => false,
  )
}
