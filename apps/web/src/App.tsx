import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { AppShell } from '@/components/layout/app-shell'
import { ClubDetailPage, ClubsPage } from '@/pages/clubs'
import { HomePage } from '@/pages/home'
import { MatchDetailPage, MatchesPage } from '@/pages/matches'
import { NotFoundPage } from '@/pages/not-found'
import { OpponentDetailPage, OpponentsPage } from '@/pages/opponents'
import { TournamentDetailPage, TournamentsPage } from '@/pages/tournaments'

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'matches', element: <MatchesPage /> },
      { path: 'matches/:id', element: <MatchDetailPage /> },
      { path: 'opponents', element: <OpponentsPage /> },
      { path: 'opponents/:id', element: <OpponentDetailPage /> },
      { path: 'clubs', element: <ClubsPage /> },
      { path: 'clubs/:id', element: <ClubDetailPage /> },
      { path: 'tournaments', element: <TournamentsPage /> },
      { path: 'tournaments/:id', element: <TournamentDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
