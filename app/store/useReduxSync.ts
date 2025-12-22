'use client'

/**
 * Redux Sync Hook
 *
 * Bridges the existing useTrainingMessagesComposite hook with Redux store.
 * This allows gradual migration while keeping the app working.
 *
 * Usage:
 * 1. Keep using useTrainingMessagesComposite as before
 * 2. Call useReduxSync(training) to sync state to Redux
 * 3. Components can now read from Redux store using selectors
 * 4. Gradually migrate components to use Redux selectors
 */

import { useEffect } from 'react'
import { useAppDispatch } from './hooks'
import {
  syncFromHook,
  setConnectionStatus,
  setIsConnected,
  setLastMessage,
  setMessageLog,
} from './slices'
import type { TrainingState } from '@/app/hooks/useTrainingMessagesComposite'
import type { MessageLogEntry } from '@/app/lib/messageTypes'

interface TrainingHookReturn {
  state: TrainingState
  isConnected: boolean
  lastMessage: { type: string; dataString: string } | null
  messageLog: MessageLogEntry[]
}

/**
 * Syncs the training hook state to Redux store.
 * Call this in StreamingApp after useTrainingMessagesComposite.
 */
export function useReduxSync(training: TrainingHookReturn) {
  const dispatch = useAppDispatch()

  // Sync training state to Redux
  useEffect(() => {
    dispatch(syncFromHook(training.state))
  }, [dispatch, training.state])

  // Sync connection state
  useEffect(() => {
    dispatch(setIsConnected(training.isConnected))
    dispatch(setConnectionStatus(training.isConnected ? 'connected' : 'connecting'))
  }, [dispatch, training.isConnected])

  // Sync last message
  useEffect(() => {
    if (training.lastMessage) {
      dispatch(setLastMessage(training.lastMessage))
    }
  }, [dispatch, training.lastMessage])

  // Sync message log (only when length changes to avoid excessive updates)
  useEffect(() => {
    dispatch(setMessageLog(training.messageLog))
  }, [dispatch, training.messageLog.length])
}

/**
 * Hook for components that only need to read state.
 * Uses Redux selectors for optimized re-renders.
 */
export { useAppSelector, useAppDispatch } from './hooks'
