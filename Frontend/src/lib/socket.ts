import { io, Socket } from 'socket.io-client'
import { backendBaseUrl } from './api'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null

  if (!socket) {
    socket = io(backendBaseUrl(), {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket'],
      upgrade: false,
      reconnectionAttempts: 5,
    })

    socket.on('connect_error', (error) => {
      console.error('Realtime socket connection error:', error)
    })
  }

  return socket
}
