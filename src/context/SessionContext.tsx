import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  api,
  AskLiveError,
  type HostQuestion,
  type Poll,
  type QuestionStatus,
  type Role,
  type SessionStatus,
} from '../api'
import { createWsClient, type WsHandlers } from '../ws'

const ROLE_KEY = 'asklive:role'
const CODE_KEY = 'asklive:code'
const HOST_TOKEN_KEY = 'asklive:hostToken'
const PARTICIPANT_TOKEN_KEY = 'asklive:participantToken'
const ATTENDEE_NAME_KEY = 'asklive:attendeeName'

interface SessionContextValue {
  role: Role | null
  code: string | null
  hostToken: string | null
  participantToken: string | null
  attendeeName: string | null
  status: SessionStatus | null
  poll: Poll | null
  polls: Poll[]
  questions: HostQuestion[]
  error: string | null
  loading: boolean
  createSession: () => Promise<void>
  joinSession: (code: string, displayName: string) => Promise<void>
  signOut: () => void
  createPoll: (question: string, multipleChoice: boolean, options: string[]) => Promise<void>
  launchPoll: (pollId: number) => Promise<void>
  closePoll: (pollId: number) => Promise<void>
  vote: (pollId: number, optionIds: number[]) => Promise<void>
  askQuestion: (text: string) => Promise<void>
  upvoteQuestion: (questionId: number) => Promise<void>
  toggleQuestionStatus: (questionId: number, status: QuestionStatus) => Promise<void>
  deleteQuestion: (questionId: number) => Promise<void>
  endSession: () => Promise<void>
  loadSession: () => Promise<void>
  setError: (message: string | null) => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(() => (localStorage.getItem(ROLE_KEY) as Role | null))
  const [code, setCode] = useState<string | null>(() => localStorage.getItem(CODE_KEY) || null)
  const [hostToken, setHostToken] = useState<string | null>(() => localStorage.getItem(HOST_TOKEN_KEY) || null)
  const [participantToken, setParticipantToken] = useState<string | null>(() => localStorage.getItem(PARTICIPANT_TOKEN_KEY) || null)
  const [attendeeName, setAttendeeName] = useState<string | null>(() => localStorage.getItem(ATTENDEE_NAME_KEY) || null)
  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [poll, setPoll] = useState<Poll | null>(null)
  const [polls, setPolls] = useState<Poll[]>([])
  const [questions, setQuestions] = useState<HostQuestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const ws = useRef<ReturnType<typeof createWsClient> | null>(null)

  const setErrorState = useCallback((message: string | null) => {
    setError(message)
  }, [])

  const persist = useCallback((r: Role, c: string, host?: string, participant?: string, name?: string) => {
    localStorage.setItem(ROLE_KEY, r)
    localStorage.setItem(CODE_KEY, c)
    if (host !== undefined) {
      if (host) localStorage.setItem(HOST_TOKEN_KEY, host)
      else localStorage.removeItem(HOST_TOKEN_KEY)
    }
    if (participant !== undefined) {
      if (participant) localStorage.setItem(PARTICIPANT_TOKEN_KEY, participant)
      else localStorage.removeItem(PARTICIPANT_TOKEN_KEY)
    }
    if (name !== undefined) {
      if (name) localStorage.setItem(ATTENDEE_NAME_KEY, name)
      else localStorage.removeItem(ATTENDEE_NAME_KEY)
    }
  }, [])

  const authHeaders = useCallback(() => ({
    hostToken,
    participantToken,
  }), [hostToken, participantToken])

  const connectWs = useCallback(() => {
    if (!code || !role) return
    if (ws.current) {
      ws.current.deactivate()
      ws.current = null
    }
    const client = createWsClient(code, {
      onPoll: (payload) => {
        const p = payload as Poll
        setPoll(p)
        setPolls((all) => {
          const exists = all.some((x) => x.pollId === p.pollId)
          return exists ? all.map((x) => (x.pollId === p.pollId ? p : x)) : [...all, p]
        })
      },
      onQuestions: (payload) => {
        const qs = (payload as HostQuestion[]).map((q) => ({ ...q, status: 'VISIBLE' as QuestionStatus }))
        if (role === 'attendee') {
          setQuestions(qs)
        } else {
          setQuestions((all) => {
            const byId = new Map<number, HostQuestion>(all.map((q) => [q.id, q]))
            for (const q of qs) byId.set(q.id, q)
            return [...byId.values()]
          })
        }
      },
      onStatus: (payload) => {
        if (payload.status === 'ENDED') {
          setStatus('ENDED')
        }
      },
    })
    ws.current = client
  }, [code, role])

  // Reconnect when session code or role changes
  useEffect(() => {
    connectWs()
    return () => {
      if (ws.current) {
        ws.current.deactivate()
        ws.current = null
      }
    }
  }, [connectWs])

  const clearSession = useCallback(() => {
    setRole(null)
    setCode(null)
    setHostToken(null)
    setParticipantToken(null)
    setAttendeeName(null)
    setStatus(null)
    setPoll(null)
    setPolls([])
    setQuestions([])
    localStorage.removeItem(ROLE_KEY)
    localStorage.removeItem(CODE_KEY)
    localStorage.removeItem(HOST_TOKEN_KEY)
    localStorage.removeItem(PARTICIPANT_TOKEN_KEY)
    localStorage.removeItem(ATTENDEE_NAME_KEY)
    if (ws.current) {
      ws.current.deactivate()
      ws.current = null
    }
  }, [])

  const setLoadingAction = useCallback((value: boolean) => setLoading(value), [])

  function withLoading<T>(fn: () => Promise<T>): Promise<T> {
    setLoadingAction(true)
    return fn().finally(() => setLoadingAction(false))
  }

  const handleError = useCallback((err: unknown) => {
    setLoadingAction(false)
    if (err instanceof AskLiveError) {
      setErrorState(err.message)
    } else if (err instanceof Error) {
      setErrorState(err.message)
    } else {
      setErrorState('Unexpected error')
    }
  }, [setLoadingAction, setErrorState])

  const createSession = useCallback(async () => {
    const data = await withLoading(() => api.createSession())
    setCode(data.code)
    setHostToken(data.hostToken)
    setRole('host')
    setStatus('ACTIVE')
    persist('host', data.code, data.hostToken)
    connectWs()
  }, [persist, connectWs])

  const joinSession = useCallback(async (joinCode: string, displayName: string) => {
    const data = await withLoading(() => api.joinSession(joinCode, displayName))
    setCode(joinCode)
    setParticipantToken(data.participantToken)
    setRole('attendee')
    setAttendeeName(displayName)
    setStatus('ACTIVE')
    persist('attendee', joinCode, undefined, data.participantToken, displayName)
    connectWs()
  }, [persist, connectWs])

  const signOut = useCallback(() => {
    setErrorState(null)
    clearSession()
  }, [clearSession, setErrorState])

  const loadSession = useCallback(async () => {
    if (!code) return
    const sessionCode = code
    setLoadingAction(true)
    try {
      const state = await api.getState(
        sessionCode,
        authHeaders().hostToken ?? undefined,
        authHeaders().participantToken ?? undefined,
      )
      setStatus(state.status)
      setPoll(state.poll || null)
      if (role === 'host') {
        const [allPolls, allQuestions] = await Promise.all([
          api.listPolls(sessionCode, authHeaders().hostToken ?? undefined),
          api.listQuestionsHost(sessionCode, authHeaders().hostToken!),
        ])
        setPolls(allPolls)
        setQuestions(allQuestions)
      } else {
        setQuestions((state.questions || []).map((q) => ({ ...q, status: 'VISIBLE' as QuestionStatus })))
      }
    } catch (err) {
      handleError(err)
    } finally {
      setLoadingAction(false)
    }
  }, [code, role, authHeaders, handleError, setLoadingAction])

  const createPoll = useCallback(async (question: string, multipleChoice: boolean, options: string[]) => {
    const created = await withLoading(() => api.createPoll(code!, authHeaders().hostToken!, { question, multipleChoice, options }))
    setPolls((all) => [created, ...all])
  }, [code, authHeaders])

  const launchPoll = useCallback(async (pollId: number) => {
    const launched = await withLoading(() => api.launchPoll(code!, pollId, authHeaders().hostToken!))
    setPolls((all: Poll[]) => all.map((p: Poll) => (p.pollId === launched.pollId ? launched : p)))
    setPoll(launched)
  }, [code, authHeaders])

  const closePoll = useCallback(async (pollId: number) => {
    const closed = await withLoading(() => api.closePoll(code!, pollId, authHeaders().hostToken!))
    setPolls((all: Poll[]) => all.map((p: Poll) => (p.pollId === closed.pollId ? closed : p)))
    setPoll((current) => (current?.pollId === closed.pollId ? closed : current))
  }, [code, authHeaders])

  const vote = useCallback(async (pollId: number, optionIds: number[]) => {
    await withLoading(() => api.vote(code!, pollId, authHeaders().participantToken!, optionIds))
  }, [code, authHeaders])

  const askQuestion = useCallback(async (text: string) => {
    await withLoading(() => api.createQuestion(code!, authHeaders().participantToken!, text))
  }, [code, authHeaders])

  const upvoteQuestion = useCallback(async (questionId: number) => {
    await withLoading(() => api.upvoteQuestion(code!, questionId, authHeaders().participantToken!))
  }, [code, authHeaders])

  const toggleQuestionStatus = useCallback(async (questionId: number, status: QuestionStatus) => {
    const updated = await withLoading(() => api.updateQuestionStatus(code!, questionId, authHeaders().hostToken!, status))
    setQuestions((all) => all.map((q) => (q.id === updated.id ? updated : q)))
  }, [code, authHeaders])

  const deleteQuestion = useCallback(async (questionId: number) => {
    await withLoading(() => api.deleteQuestion(code!, questionId, authHeaders().hostToken!))
    setQuestions((all) => all.filter((q) => q.id !== questionId))
  }, [code, authHeaders])

  const endSession = useCallback(async () => {
    await withLoading(() => api.endSession(code!, authHeaders().hostToken!))
    setStatus('ENDED')
  }, [code, authHeaders])

  const value: SessionContextValue = {
    role,
    code,
    hostToken,
    participantToken,
    attendeeName,
    status,
    poll,
    polls,
    questions,
    error,
    loading,
    createSession,
    joinSession,
    signOut,
    createPoll,
    launchPoll,
    closePoll,
    vote,
    askQuestion,
    upvoteQuestion,
    toggleQuestionStatus,
    deleteQuestion,
    endSession,
    loadSession,
    setError: setErrorState,
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionProvider')
  return ctx
}
