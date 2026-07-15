import { useEffect } from 'react'

const APP_NAME = 'Tennisfolio'

/** Sets the document title to "<title> · Tennisfolio" (or the bare app name). */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])
}
