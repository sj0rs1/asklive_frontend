import { Logo } from '../components/Logo'
import { Icon } from '../components/Icon'
import { useSession } from '../context/SessionContext'

export function Ended() {
  const { code, signOut } = useSession()

  return (
    <main className="ended-page">
      <div className="ended-top">
        <Logo dark />
      </div>
      <section className="ended-content">
        <div className="ended-mark">
          <Icon name="check" size={30} />
        </div>
        <p className="eyebrow plain">Session complete</p>
        <h1>That's a wrap.</h1>
        <p>This session has ended. Voting and questions are now closed. Thanks for being part of the conversation.</p>
        <div className="session-summary">
          <div>
            <span>Session</span>
            <strong>{code}</strong>
          </div>
          <i />
          <div>
            <span>Status</span>
            <strong>Ended</strong>
          </div>
        </div>
        <button className="primary-button" onClick={signOut}>
          Back to AskLive <Icon name="arrow" />
        </button>
      </section>
      <p className="ended-footer">You can safely close this window.</p>
    </main>
  )
}
