import { useState, type FormEvent } from 'react'
import { Logo } from '../components/Logo'
import { Icon } from '../components/Icon'
import { ErrorBanner } from '../components/ErrorBanner'
import { useSession } from '../context/SessionContext'

export function Landing() {
  const { createSession, joinSession, loading, error, setError } = useSession()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)

  function handleJoin(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!code.trim()) return
    setJoinLoading(true)
    joinSession(code.trim(), name.trim())
      .catch(() => {
        // error is set by the context
      })
      .finally(() => setJoinLoading(false))
  }

  function handleCreate() {
    setError(null)
    createSession().catch(() => {
      // error is set by the context
    })
  }

  return (
    <main className="simple-welcome">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      <div className="simple-welcome-inner">
        <Logo />
        <section className="simple-entry-card">
          <div className="simple-entry-heading">
            <h1>Join a session</h1>
            <p>Enter the session code shared by your host.</p>
          </div>
          <form onSubmit={handleJoin}>
            <label htmlFor="code">Session code</label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="e.g. 8K4J2P"
              disabled={joinLoading}
            />
            <label htmlFor="name">Your name <span>Optional</span></label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="How should we call you?" disabled={joinLoading} />
            <button className="primary-button full" type="submit" disabled={joinLoading || loading}>
              {joinLoading ? 'Joining…' : 'Join session'}
              <Icon name="arrow" />
            </button>
          </form>
          <button className="simple-create" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating…' : 'Create a new session'}
          </button>
        </section>
      </div>
    </main>
  )
}
