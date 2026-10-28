import { useCallback, useState, type FormEvent } from 'react'
import { Logo } from '../components/Logo'
import { Icon } from '../components/Icon'
import { ErrorBanner } from '../components/ErrorBanner'
import { useSession } from '../context/SessionContext'
import type { HostQuestion } from '../api'
import type { PollOption } from '../types'

export function HostDashboard() {
  const {
    code,
    hostToken,
    polls,
    questions,
    status,
    loading,
    error,
    setError,
    endSession,
    createPoll,
    launchPoll,
    closePoll,
    toggleQuestionStatus,
    deleteQuestion,
  } = useSession()

  const [tab, setTab] = useState<'polls' | 'questions'>('polls')
  const [showComposer, setShowComposer] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollType, setPollType] = useState<'single' | 'multiple'>('single')
  const [options, setOptions] = useState(['', ''])
  const [confirmEnd, setConfirmEnd] = useState(false)

  const activePoll = polls.find((p) => p.status === 'ACTIVE')

  function handleCreatePoll(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const cleanOptions = options.filter((item) => item.trim())
    if (!pollQuestion.trim() || cleanOptions.length < 2) return
    createPoll(pollQuestion.trim(), pollType === 'multiple', cleanOptions)
      .then(() => {
        setPollQuestion('')
        setOptions(['', ''])
        setShowComposer(false)
      })
      .catch(() => {})
  }

  function addOption() {
    setOptions((all) => [...all, ''])
  }

  function handleLaunch(pollId: number) {
    setError(null)
    const currentlyActive = polls.find((p) => p.status === 'ACTIVE')
    const go = () => launchPoll(pollId)
    if (currentlyActive && currentlyActive.pollId !== pollId) {
      closePoll(currentlyActive.pollId).then(go).catch(() => {})
    } else {
      go().catch(() => {})
    }
  }

  function handleClose(pollId: number) {
    setError(null)
    closePoll(pollId).catch(() => {})
  }

  function handleToggleVisibility(questionId: number, visible: boolean) {
    setError(null)
    toggleQuestionStatus(questionId, visible ? 'HIDDEN' : 'VISIBLE').catch(() => {})
  }

  function handleDeleteQuestion(questionId: number) {
    setError(null)
    deleteQuestion(questionId).catch(() => {})
  }

  function handleEnd() {
    setConfirmEnd(true)
  }

  function confirmEndSession() {
    setConfirmEnd(false)
    if (window.confirm('Ending the session will close voting and questions for everyone. Continue?')) {
      endSession().catch(() => {})
    }
  }

  const visibleCount = questions.filter((q) => q.status === 'VISIBLE').length

  return (
    <main className="dashboard-page">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      <header className="dash-nav">
        <Logo />
        <div className="session-identity">
          <span>SESSION CODE</span>
          <strong>{code}</strong>
          <button type="button" onClick={() => navigator.clipboard?.writeText(code ?? '')} aria-label="Copy session code">
            Copy
          </button>
          {hostToken && (
            <div className="token-card">
              <p>Host token — shown once, cannot be reset</p>
              <div className="token-value">
                <code>{hostToken}</code>
                <button type="button" onClick={() => navigator.clipboard?.writeText(hostToken)} aria-label="Copy host token">
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="session-actions">
          <span className="live-pill"><i /> {status === 'ACTIVE' ? 'Live session' : 'Session ended'}</span>
          <button className="end-button" onClick={handleEnd} disabled={loading || status === 'ENDED'}>
            {confirmEnd ? 'Confirm end?' : 'End session'}
          </button>
          {confirmEnd && (
            <button type="button" className="primary-button" onClick={confirmEndSession} disabled={loading || status === 'ENDED'}>
              Yes, end session
            </button>
          )}
        </div>
      </header>

      <div className="dashboard-shell">
        <aside>
          <p className="side-label">Workspace</p>
          <button className={tab === 'polls' ? 'active' : ''} onClick={() => setTab('polls')}>
            <Icon name="chart" /> Polls <span>{polls.length}</span>
          </button>
          <button className={tab === 'questions' ? 'active' : ''} onClick={() => setTab('questions')}>
            <Icon name="message" /> Questions <span>{visibleCount}</span>
          </button>
          <div className="audience-card">
            <Icon name="users" />
            <strong>—</strong>
            <span>people joined</span>
            <div>
              <i />
              <p>Audience connected</p>
            </div>
          </div>
        </aside>
        <section className="dash-content">
          <div className="content-heading">
            <div>
              <p className="eyebrow plain">{tab === 'polls' ? 'Live polling' : 'Audience Q&A'}</p>
              <h1>{tab === 'polls' ? 'Polls' : 'Questions'}</h1>
              <p>
                {tab === 'polls' ? 'Create, launch, and review audience polls.' : 'Moderate what your audience wants to know.'}
              </p>
            </div>
            {tab === 'polls' && (
              <button className="primary-button" onClick={() => setShowComposer((v) => !v)} disabled={loading}>
                <Icon name={showComposer ? 'x' : 'plus'} /> {showComposer ? 'Cancel' : 'New poll'}
              </button>
            )}
          </div>

          {tab === 'polls' ? (
            <div className="poll-list">
              {showComposer && (
                <form className="composer" onSubmit={handleCreatePoll}>
                  <div className="composer-title">
                    <div>
                      <span>New poll</span>
                      <h3>Ask your audience</h3>
                    </div>
                    <div className="type-toggle">
                      <button
                        type="button"
                        className={pollType === 'single' ? 'selected' : ''}
                        onClick={() => setPollType('single')}
                        disabled={loading}
                      >
                        Single choice
                      </button>
                      <button
                        type="button"
                        className={pollType === 'multiple' ? 'selected' : ''}
                        onClick={() => setPollType('multiple')}
                        disabled={loading}
                      >
                        Multiple choice
                      </button>
                    </div>
                  </div>
                  <label>Question</label>
                  <input
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="What would you like to ask?"
                    autoFocus
                    disabled={loading}
                  />
                  <div className="option-fields">
                    {options.map((option, index) => (
                      <label key={index}>
                        Option {index + 1}
                        <div>
                          <span>{String.fromCharCode(65 + index)}</span>
                          <input
                            value={option}
                            onChange={(e) =>
                              setOptions((all) => all.map((item, i) => (i === index ? e.target.value : item)))
                            }
                            placeholder="Type an answer"
                            disabled={loading}
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="composer-actions">
                    <button type="button" className="text-button" onClick={addOption} disabled={loading}>
                      <Icon name="plus" size={16} /> Add option
                    </button>
                    <button className="primary-button" type="submit" disabled={loading || !pollQuestion.trim() || options.filter((o) => o.trim()).length < 2}>
                      Save as draft
                    </button>
                  </div>
                </form>
              )}
              {polls.length === 0 && !showComposer && (
                <div className="poll-card" style={{ padding: 40, textAlign: 'center', color: '#8c9690' }}>
                  No polls yet. Create your first poll to get started.
                </div>
              )}
              {polls.map((poll, index) => {
                const total = poll.options.reduce((sum: number, o: PollOption) => sum + o.votes, 0)
                return (
                  <article className={`poll-card ${poll.status.toLowerCase()}`} key={poll.pollId}>
                    <div className="poll-top">
                      <div className="poll-number">0{polls.length - index}</div>
                      <div className="poll-title">
                        <div>
                          <span className={`status ${poll.status.toLowerCase()}`}>{poll.status}</span>
                          <span>{poll.multipleChoice ? 'Multiple choice' : 'Single choice'}</span>
                        </div>
                        <h3>{poll.question}</h3>
                      </div>
                      <button
                        className={poll.status === 'ACTIVE' ? 'outline-button danger' : 'outline-button'}
                        onClick={() => (poll.status === 'ACTIVE' ? handleClose(poll.pollId) : handleLaunch(poll.pollId))}
                        disabled={loading || status === 'ENDED'}
                      >
                        {poll.status === 'ACTIVE'
                          ? 'Close poll'
                          : poll.status === 'DRAFT'
                            ? 'Launch poll'
                            : 'Re-launch'}
                      </button>
                    </div>
                    <div className="results">
                      {poll.options.map((option: PollOption, optionIndex: number) => {
                        const percent = total ? Math.round((option.votes / total) * 100) : 0
                        return (
                          <div className="result" key={String(option.id)}>
                            <div className="result-label">
                              <span>
                                <i>{String.fromCharCode(65 + optionIndex)}</i>{option.text}
                              </span>
                              <strong>{option.votes} <small>votes</small></strong>
                            </div>
                            <div className="track">
                              <span style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="poll-footer">
                      <span>{total} total votes</span>
                      {poll.status === 'ACTIVE' && <span className="accepting"><i /> Accepting responses</span>}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="question-list host-questions">
              <div className="list-caption">
                <span>{questions.length} questions</span>
                <span>Sorted by popularity</span>
              </div>
              {questions.length === 0 && (
                <div className="poll-card" style={{ padding: 40, textAlign: 'center', color: '#8c9690' }}>
                  No questions yet.
                </div>
              )}
              {[...questions].sort((a, b) => b.upvotes - a.upvotes || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((question) => (
                <article className={`question-card${question.status === 'HIDDEN' ? ' hidden-question' : ''}`} key={question.id}>
                  <div className="vote-box">
                    <strong>{question.upvotes}</strong>
                    <span>votes</span>
                  </div>
                  <div className="question-copy">
                    <p>{question.text}</p>
                    <span>
                      {question.authorName ? `${question.authorName} · ` : ''}
                      {question.status === 'VISIBLE' ? 'Visible to everyone' : 'Hidden from audience'}
                    </span>
                  </div>
                  <div className="moderation">
                    <button
                      title={question.status === 'VISIBLE' ? 'Hide question' : 'Show question'}
                      onClick={() => handleToggleVisibility(question.id, question.status === 'VISIBLE')}
                      disabled={loading || status === 'ENDED'}
                    >
                      <Icon name={question.status === 'VISIBLE' ? 'eyeOff' : 'eye'} />
                    </button>
                    <button
                      title="Delete question"
                      className="delete"
                      onClick={() => handleDeleteQuestion(question.id)}
                      disabled={loading || status === 'ENDED'}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
