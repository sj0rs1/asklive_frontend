import {
  API_BASE,
  type ApiError,
  type HostQuestion,
  type Poll,
  type PollOption,
  type Role,
  type SessionState,
  type SessionStatus,
} from './types'

export type { Role, SessionStatus, Poll, HostQuestion, SessionState, ApiError }
export type QuestionStatus = 'VISIBLE' | 'HIDDEN'

class AskLiveError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'AskLiveError'
  }
}

function headers(hostToken?: string, participantToken?: string): Record<string, string> {
  const h: Record<string, string> = {}
  if (hostToken) h['X-Host-Token'] = hostToken
  if (participantToken) h['X-Participant-Token'] = participantToken
  return h
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as ApiError
      if (body?.message) message = body.message
    } catch {
      // ignore malformed error bodies
    }
    throw new AskLiveError(response.status, message)
  }
  if (response.status === 204) return undefined as unknown as T
  return (await response.json()) as T
}

export const api = {
  createSession: () =>
    fetch(`${API_BASE}/api/sessions`, { method: 'POST' }).then((r) => parseJson<{ code: string; hostToken: string }>(r)),

  getState: (code: string, hostToken?: string, participantToken?: string) =>
    fetch(`${API_BASE}/api/sessions/${encodeURIComponent(code)}`, {
      headers: headers(hostToken, participantToken),
    }).then((r) => parseJson<SessionState>(r)),

  endSession: (code: string, hostToken: string) =>
    fetch(`${API_BASE}/api/sessions/${encodeURIComponent(code)}/end`, {
      method: 'POST',
      headers: headers(hostToken),
    }).then((r) => parseJson<void>(r)),

  joinSession: (code: string, displayName?: string) =>
    fetch(`${API_BASE}/api/sessions/${encodeURIComponent(code)}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: displayName || undefined }),
    }).then((r) => parseJson<{ participantToken: string }>(r)),

  listPolls: (code: string, hostToken?: string, participantToken?: string) =>
    fetch(`${API_BASE}/api/sessions/${encodeURIComponent(code)}/polls`, {
      headers: headers(hostToken, participantToken),
    }).then((r) => parseJson<Poll[]>(r)),

  createPoll: (
    code: string,
    hostToken: string,
    body: { question: string; multipleChoice: boolean; options: string[] },
  ) =>
    fetch(`${API_BASE}/api/sessions/${encodeURIComponent(code)}/polls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers(hostToken) },
      body: JSON.stringify(body),
    }).then((r) => parseJson<Poll>(r)),

  launchPoll: (code: string, pollId: number, hostToken: string) =>
    fetch(`${API_BASE}/api/sessions/${encodeURIComponent(code)}/polls/${pollId}/launch`, {
      method: 'POST',
      headers: headers(hostToken),
    }).then((r) => parseJson<Poll>(r)),

  closePoll: (code: string, pollId: number, hostToken: string) =>
    fetch(`${API_BASE}/api/sessions/${encodeURIComponent(code)}/polls/${pollId}/close`, {
      method: 'POST',
      headers: headers(hostToken),
    }).then((r) => parseJson<Poll>(r)),

  vote: (code: string, pollId: number, participantToken: string, optionIds: number[]) =>
    fetch(`${API_BASE}/api/sessions/${encodeURIComponent(code)}/polls/${pollId}/votes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers(undefined, participantToken) },
      body: JSON.stringify({ optionIds }),
    }).then((r) => parseJson<Poll>(r)),

  listQuestionsHost: (code: string, hostToken: string) =>
    fetch(`${API_BASE}/api/sessions/${encodeURIComponent(code)}/questions`, {
      headers: headers(hostToken),
    }).then((r) => parseJson<HostQuestion[]>(r)),

  createQuestion: (code: string, participantToken: string, text: string) =>
    fetch(`${API_BASE}/api/sessions/${encodeURIComponent(code)}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers(undefined, participantToken) },
      body: JSON.stringify({ text }),
    }).then((r) =>
      parseJson<{ id: number; text: string; authorName: string; upvotes: number; createdAt: string }>(r),
    ),

  upvoteQuestion: (code: string, questionId: number, participantToken: string) =>
    fetch(`${API_BASE}/api/sessions/${encodeURIComponent(code)}/questions/${questionId}/upvotes`, {
      method: 'POST',
      headers: headers(undefined, participantToken),
    }).then((r) => parseJson<{ id: number; upvotes: number }>(r)),

  updateQuestionStatus: (code: string, questionId: number, hostToken: string, status: QuestionStatus) =>
    fetch(`${API_BASE}/api/sessions/${encodeURIComponent(code)}/questions/${questionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers(hostToken) },
      body: JSON.stringify({ status }),
    }).then((r) => parseJson<HostQuestion>(r)),

  deleteQuestion: (code: string, questionId: number, hostToken: string) =>
    fetch(`${API_BASE}/api/sessions/${encodeURIComponent(code)}/questions/${questionId}`, {
      method: 'DELETE',
      headers: headers(hostToken),
    }).then((r) => parseJson<void>(r)),
}

export { AskLiveError }
