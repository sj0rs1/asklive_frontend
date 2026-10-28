import { Client } from '@stomp/stompjs'
import { API_BASE } from './types'

export interface WsHandlers {
  onPoll: (poll: unknown) => void
  onQuestions: (questions: unknown[]) => void
  onStatus: (status: { status: string }) => void
}

export function createWsClient(code: string, handlers: WsHandlers): Client {
  // Spring's STOMP endpoint (/ws) accepts raw WebSocket connections natively,
  // so SockJS is unnecessary on modern browsers and is avoided here (it is
  // incompatible with the current Vite/Rolldown bundler).
  const wsUrl = `${API_BASE.replace(/^http/, 'ws')}/ws`
  const client = new Client({
    webSocketFactory: () => new WebSocket(wsUrl),
    connectHeaders: {},
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    onConnect: () => {
      client.subscribe(`/topic/session/${code}/poll`, (message) => {
        try {
          handlers.onPoll(JSON.parse(message.body))
        } catch {
          // ignore malformed payloads
        }
      })
      client.subscribe(`/topic/session/${code}/questions`, (message) => {
        try {
          handlers.onQuestions(JSON.parse(message.body))
        } catch {
          // ignore malformed payloads
        }
      })
      client.subscribe(`/topic/session/${code}/status`, (message) => {
        try {
          handlers.onStatus(JSON.parse(message.body))
        } catch {
          // ignore malformed payloads
        }
      })
    },
    onStompError: (frame) => {
      console.warn('STOMP error', frame)
    },
  })
  client.activate()
  return client
}
