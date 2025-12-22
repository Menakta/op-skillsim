/**
 * Connection Slice
 *
 * Manages connection state: stream status, retry logic, message log.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import type { MessageLogEntry } from '@/app/lib/messageTypes'

// =============================================================================
// State Types
// =============================================================================

export type ConnectionStatus = 'initializing' | 'connecting' | 'connected' | 'failed' | 'retrying'

export interface ConnectionSliceState {
  // Connection status
  status: ConnectionStatus
  isConnected: boolean
  isRetrying: boolean

  // Retry state
  retryCount: number
  maxRetries: number

  // Error state
  initError: string | null

  // Message log
  messageLog: MessageLogEntry[]
  lastMessage: { type: string; dataString: string } | null
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: ConnectionSliceState = {
  // Connection status
  status: 'initializing',
  isConnected: false,
  isRetrying: false,

  // Retry state
  retryCount: 0,
  maxRetries: 3,

  // Error state
  initError: null,

  // Message log
  messageLog: [],
  lastMessage: null,
}

// =============================================================================
// Slice Definition
// =============================================================================

export const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    // Connection Status
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.status = action.payload
      state.isConnected = action.payload === 'connected'
      state.isRetrying = action.payload === 'retrying'
    },

    setIsConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload
      if (action.payload) {
        state.status = 'connected'
        state.retryCount = 0
        state.initError = null
      }
    },

    // Retry Logic
    setRetryCount: (state, action: PayloadAction<number>) => {
      state.retryCount = action.payload
    },

    incrementRetryCount: (state) => {
      state.retryCount += 1
    },

    resetRetryCount: (state) => {
      state.retryCount = 0
    },

    setIsRetrying: (state, action: PayloadAction<boolean>) => {
      state.isRetrying = action.payload
      if (action.payload) {
        state.status = 'retrying'
      }
    },

    // Error State
    setInitError: (state, action: PayloadAction<string | null>) => {
      state.initError = action.payload
      if (action.payload) {
        state.status = 'failed'
      }
    },

    // Message Log
    addMessageToLog: (state, action: PayloadAction<MessageLogEntry>) => {
      state.messageLog.push(action.payload)
      // Keep log size manageable
      if (state.messageLog.length > 100) {
        state.messageLog = state.messageLog.slice(-100)
      }
    },

    setLastMessage: (state, action: PayloadAction<{ type: string; dataString: string } | null>) => {
      state.lastMessage = action.payload
    },

    setMessageLog: (state, action: PayloadAction<MessageLogEntry[]>) => {
      state.messageLog = action.payload
    },

    clearMessageLog: (state) => {
      state.messageLog = []
      state.lastMessage = null
    },

    // Connection Failed
    connectionFailed: (state, action: PayloadAction<string>) => {
      state.status = 'failed'
      state.isConnected = false
      state.isRetrying = false
      state.initError = action.payload
    },

    // Start Retry
    startRetry: (state) => {
      state.status = 'retrying'
      state.isRetrying = true
      state.retryCount += 1
    },

    // Reset Connection
    resetConnection: (state) => {
      state.status = 'initializing'
      state.isConnected = false
      state.isRetrying = false
      state.retryCount = 0
      state.initError = null
    },

    // Full Reset
    resetConnectionState: () => initialState,
  },
})

// =============================================================================
// Actions Export
// =============================================================================

export const {
  setConnectionStatus,
  setIsConnected,
  setRetryCount,
  incrementRetryCount,
  resetRetryCount,
  setIsRetrying,
  setInitError,
  addMessageToLog,
  setLastMessage,
  setMessageLog,
  clearMessageLog,
  connectionFailed,
  startRetry,
  resetConnection,
  resetConnectionState,
} = connectionSlice.actions

// =============================================================================
// Selectors
// =============================================================================

// Connection Status
export const selectConnectionStatus = (state: RootState) => state.connection.status
export const selectIsConnected = (state: RootState) => state.connection.isConnected
export const selectIsRetrying = (state: RootState) => state.connection.isRetrying

// Retry State
export const selectRetryCount = (state: RootState) => state.connection.retryCount
export const selectMaxRetries = (state: RootState) => state.connection.maxRetries

// Error State
export const selectInitError = (state: RootState) => state.connection.initError

// Message Log
export const selectMessageLog = (state: RootState) => state.connection.messageLog
export const selectLastMessage = (state: RootState) => state.connection.lastMessage

// Combined
export const selectConnectionState = (state: RootState) => state.connection

export default connectionSlice.reducer
