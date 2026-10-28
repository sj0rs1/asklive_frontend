import { useEffect } from 'react'
import { ErrorBanner } from './components/ErrorBanner'
import { AttendeeView } from './pages/AttendeeView'
import { Ended } from './pages/Ended'
import { HostDashboard } from './pages/HostDashboard'
import { Landing } from './pages/Landing'
import { SessionProvider, useSession } from './context/SessionContext'

function AppInner() {
  const { role, status, error, setError, loadSession } = useSession()

  // Restore an in-progress session on refresh so the WebSocket can take over
  // real-time updates from the last known snapshot.
  useEffect(() => {
    if ((role === 'host' || role === 'attendee') && status == null) {
      void loadSession()
    }
  }, [role, status, loadSession])

  if (status === 'ENDED') {
    return <Ended />
  }
  if (role === 'host') {
    return <HostDashboard />
  }
  if (role === 'attendee') {
    return <AttendeeView />
  }
  return (
    <div className="welcome-page">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      <Landing />
    </div>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <AppInner />
    </SessionProvider>
  )
}
