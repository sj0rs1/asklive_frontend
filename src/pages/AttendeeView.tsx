import { useCallback, useState, type FormEvent } from 'react'
import { Logo } from '../components/Logo'
import { Icon } from '../components/Icon'
import { ErrorBanner } from '../components/ErrorBanner'
import { useSession } from '../context/SessionContext'
import type { HostQuestion } from '../api'

export function AttendeeView() {
  const {
    code,
    participantToken,
    attendeeName,
    poll,
    questions,
    loading,
    error,
    setError,
    joinSession,
    vote,
    askQuestion,
    upvoteQuestion,
  } = useSession()

  const [joinCode, setJoinCode] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [voted, setVoted] = useState(false)
  const [upvotedQuestionIds, setUpvotedQuestionIds] = useState<Set<number>>(new Set())

  const activePoll = poll?.status === 'ACTIVE' ? poll : null
  const visibleQuestions = [...(questions || [])]
    .sort((a, b) => b.upvotes - a.upvotes || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  function handleJoin(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!joinCode.trim()) return
    setJoinLoading(true)
    joinSession(joinCode.trim(), joinName.trim())
      .catch(() => {})
      .finally(() => setJoinLoading(false))
  }

  function selectOption(index: number) {
    if (!activePoll || voted || participantToken == null) return
    if (activePoll.multipleChoice) {
      setSelected((current) => (current.includes(index) ? current.filter((i) => i !== index) : [...current, index]))
    } else {
      setSelected([index])
    }
  }

  function handleVote() {
    if (!activePoll || selected.length === 0 || participantToken == null) return
    const optionIds = activePoll.options.map((_, index: number) => index).filter((index: number) =>
      selected.includes(index),
    )
    vote(activePoll.pollId, optionIds)
      .then(() => setVoted(true))
      .catch(() => {})
  }

  function handleAsk(event: FormEvent) {
    event.preventDefault()
    if (!newQuestion.trim() || participantToken == null) return
    askQuestion(newQuestion.trim())
      .then(() => setNewQuestion(''))
      .catch(() => {})
  }

  function handleUpvote(questionId: number) {
    if (participantToken == null || upvotedQuestionIds.has(questionId)) return
    upvoteQuestion(questionId)
      .then(() => setUpvotedQuestionIds((current) => new Set([...current, questionId])))
      .catch(() => {})
  }

  if (!participantToken) {
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
              <label htmlFor="join-code">Session code</label>
              <input
                id="join-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="e.g. 8K4J2P"
                disabled={joinLoading}
              />
              <label htmlFor="join-name">Your name <span>Optional</span></label>
              <input
                id="join-name"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="How should we call you?"
                disabled={joinLoading}
              />
              <button className="primary-button full" type="submit" disabled={joinLoading || loading}>
                {joinLoading ? 'Joining…' : 'Join session'}
                <Icon name="arrow" />
              </button>
            </form>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="attendee-page">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      <header className="attendee-nav">
        <Logo />
        <div>
          <span><i /> Live</span>
          <strong>{code}</strong>
        </div>
      </header>
      <section className="attendee-shell">
        <div className="hello">
          <p>Good morning{attendeeName ? `, ${attendeeName.split(' ')[0]}` : ''}</p>
          <h1>You're in the room.</h1>
        </div>

        {activePoll ? (
          <article className="active-poll">
            <div className="active-label">
              <Icon name="radio" />
              <span>LIVE POLL</span>
              <small>{activePoll.multipleChoice ? 'Choose all that apply' : 'Choose one'}</small>
            </div>
            <h2>{activePoll.question}</h2>
            <div className="answer-list">
              {activePoll.options.map((option, index) => (
                <button
                  key={String(option.id)}
                  className={selected.includes(index) ? 'answer selected' : 'answer'}
                  onClick={() => selectOption(index)}
                  disabled={voted || loading}
                >
                  <span className="answer-letter">{String.fromCharCode(65 + index)}</span>
                  <span>{option.text}</span>
                </button>
              ))}
            </div>
            {voted ? (
              <div className="vote-confirm">
                <Icon name="check" />
                <span>
                  <strong>Vote submitted</strong>
                  Your choice is locked in.
                </span>
              </div>
            ) : (
              <button className="vote-button" disabled={!selected.length || loading || voted} onClick={handleVote}>
                Submit vote <Icon name="arrow" />
              </button>
            )}
          </article>
        ) : (
          <div className="waiting-card">
            <Icon name="radio" size={28} />
            <h2>Waiting for the next poll</h2>
            <p>The host will launch one soon.</p>
          </div>
        )}

        <section className="audience-questions">
          <div className="section-title">
            <div>
              <p>Audience Q&A</p>
              <h2>Ask the speaker</h2>
            </div>
            <span>{visibleQuestions.length} questions</span>
          </div>
          <form className="ask-form" onSubmit={handleAsk}>
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={500}
              disabled={loading}
            />
            <div>
              <span>{newQuestion.length}/500</span>
              <button disabled={!newQuestion.trim() || loading || participantToken == null} type="submit">
                Send question <Icon name="arrow" size={16} />
              </button>
            </div>
          </form>
          <div className="attendee-question-list">
            {visibleQuestions.map((question: HostQuestion) => {
              const upvoted = upvotedQuestionIds.has(question.id)
              return (
                <article key={question.id}>
                  <button
                    className={`upvote${upvoted ? ' active' : ''}`}
                    onClick={() => handleUpvote(question.id)}
                    disabled={loading || upvoted}
                  >
                    <span>⌃</span>
                    <strong>{question.upvotes}</strong>
                  </button>
                  <div>
                    <p>{question.text}</p>
                    <span>{question.authorName || 'Anonymous'}</span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </section>
    </main>
  )
}
