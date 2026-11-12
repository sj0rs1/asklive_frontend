export type Role = 'host' | 'attendee'
export type SessionStatus = 'ACTIVE' | 'ENDED'
export type PollStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'
export type QuestionStatus = 'VISIBLE' | 'HIDDEN'

export interface PollOption {
  id: number
  text: string
  votes: number
}

export interface Poll {
  pollId: number
  question: string
  multipleChoice: boolean
  status: PollStatus
  options: PollOption[]
}

export interface QuestionBase {
  id: number
  text: string
  authorName: string
  upvotes: number
  createdAt: string
}

export interface HostQuestion extends QuestionBase {
  status: QuestionStatus
}

export interface SessionState {
  code: string
  status: SessionStatus
  poll: Poll | null
  questions: QuestionBase[]
  participantCount: number
}

export interface ApiError {
  message: string
}

const apiBase = import.meta.env.VITE_API_BASE
export const API_BASE = apiBase ? String(apiBase).replace(/\/+$/, '') : ''
