import { formatScore, parseScore } from '@tennisfolio/core'
import { Button } from '@/components/ui/button'

const sampleScore = formatScore(parseScore('6-4 3-6 10-7'))

function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-3xl font-semibold">🎾 Tennisfolio</h1>
      <p className="text-muted-foreground">Hello, world — the web app is running.</p>
      <p className="text-muted-foreground text-sm">Sample score: {sampleScore}</p>
      <Button>It works</Button>
    </main>
  )
}

export default App
