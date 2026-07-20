import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { FontProvider } from './components/font-provider'
import { ThemeProvider } from './components/theme-provider'
import { queryClient } from './lib/api/query-client'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <FontProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </FontProvider>
    </ThemeProvider>
  </StrictMode>,
)
