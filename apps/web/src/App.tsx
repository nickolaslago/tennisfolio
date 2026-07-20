import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { AppShell } from '@/components/layout/app-shell'
import { ClubDetailPage, ClubFormPage, ClubsPage } from '@/pages/clubs'
import { HomePage } from '@/pages/home'
import { MatchFormPage } from '@/pages/match-form'
import { MatchDetailPage, MatchesPage } from '@/pages/matches'
import { NotFoundPage } from '@/pages/not-found'
import { OpponentDetailPage, OpponentFormPage, OpponentsPage } from '@/pages/opponents'
import { AppearanceSettingsPage } from '@/pages/settings/appearance'
import { BackupSettingsPage } from '@/pages/settings/backup'
import { GeneralSettingsPage } from '@/pages/settings/general'
import { SettingsIndexPage } from '@/pages/settings/settings-index'
import { SettingsLayout } from '@/pages/settings/settings-layout'
import { TournamentDetailPage, TournamentFormPage, TournamentsPage } from '@/pages/tournaments'

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'matches', element: <MatchesPage /> },
      { path: 'matches/new', element: <MatchFormPage /> },
      { path: 'matches/:id/complete', element: <MatchFormPage /> },
      { path: 'matches/:id/edit', element: <MatchFormPage /> },
      { path: 'matches/:id', element: <MatchDetailPage /> },
      { path: 'opponents', element: <OpponentsPage /> },
      { path: 'opponents/new', element: <OpponentFormPage /> },
      { path: 'opponents/:id/edit', element: <OpponentFormPage /> },
      { path: 'opponents/:id', element: <OpponentDetailPage /> },
      { path: 'clubs', element: <ClubsPage /> },
      { path: 'clubs/new', element: <ClubFormPage /> },
      { path: 'clubs/:id/edit', element: <ClubFormPage /> },
      { path: 'clubs/:id', element: <ClubDetailPage /> },
      { path: 'tournaments', element: <TournamentsPage /> },
      { path: 'tournaments/new', element: <TournamentFormPage /> },
      { path: 'tournaments/:id/edit', element: <TournamentFormPage /> },
      { path: 'tournaments/:id', element: <TournamentDetailPage /> },
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <SettingsIndexPage /> },
          { path: 'general', element: <GeneralSettingsPage /> },
          { path: 'appearance', element: <AppearanceSettingsPage /> },
          { path: 'backup', element: <BackupSettingsPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
