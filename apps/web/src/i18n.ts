import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '@/locales/en.json'
import pt from '@/locales/pt.json'
import de from '@/locales/de.json'
import fr from '@/locales/fr.json'
import it from '@/locales/it.json'
import nl from '@/locales/nl.json'

const LANGUAGE_STORAGE_KEY = 'tennisfolio:language'

function readStoredLanguage(): string | null {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  } catch {
    // Private mode / disabled storage — fall back to the default.
    return null
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pt: { translation: pt },
    de: { translation: de },
    fr: { translation: fr },
    it: { translation: it },
    nl: { translation: nl },
  },
  lng: readStoredLanguage() ?? 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (language) => {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Ignore write failures — the in-memory language still updates for this session.
  }
})

export default i18n
