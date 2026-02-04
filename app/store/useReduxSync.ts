'use client'

/**
 * Redux Sync Hook
 *
 * Bridges the existing useTrainingMessagesComposite hook with Redux store.
 * This allows gradual migration while keeping the app working.
 *
 * OPTIMIZED: Uses a single batched useEffect to reduce dispatch cycles.
 *
 * Usage:
 * 1. Keep using useTrainingMessagesComposite as before
 * 2. Call useReduxSync(training) to sync state to Redux
 * 3. Components can now read from Redux store using selectors
 * 4. Gradually migrate components to use Redux selectors
 */

import { useEffect, useRef } from 'react'
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
 *
 * OPTIMIZED: Single batched effect with refs to track what changed.
 */
export function useReduxSync(training: TrainingHookReturn) {
  const dispatch = useAppDispatch()

  // Refs to track previous values and avoid unnecessary dispatches
  const prevStateRef = useRef<TrainingState | null>(null)
  const prevConnectedRef = useRef<boolean | null>(null)
  const prevMessageLogLengthRef = useRef<number>(0)
  const prevLastMessageRef = useRef<{ type: string; dataString: string } | null>(null)

  // Single batched effect for all syncs
  useEffect(() => {
    // Batch all dispatches together
    const updates: (() => void)[] = []

    // Check if training state changed (compare by reference since useMemo returns same object if deps unchanged)
    if (prevStateRef.current !== training.state) {
      updates.push(() => dispatch(syncFromHook(training.state)))
      prevStateRef.current = training.state
    }

    // Check if connection state changed
    if (prevConnectedRef.current !== training.isConnected) {
      updates.push(() => {
        dispatch(setIsConnected(training.isConnected))
        dispatch(setConnectionStatus(training.isConnected ? 'connected' : 'connecting'))
      })
      prevConnectedRef.current = training.isConnected
    }

    // Check if last message changed
    if (training.lastMessage && prevLastMessageRef.current !== training.lastMessage) {
      updates.push(() => dispatch(setLastMessage(training.lastMessage!)))
      prevLastMessageRef.current = training.lastMessage
    }

    // Check if message log length changed
    if (prevMessageLogLengthRef.current !== training.messageLog.length) {
      updates.push(() => dispatch(setMessageLog(training.messageLog)))
      prevMessageLogLengthRef.current = training.messageLog.length
    }

    // Execute all updates in a single batch
    if (updates.length > 0) {
      updates.forEach(update => update())
    }
  }, [
    dispatch,
    training.state,
    training.isConnected,
    training.lastMessage,
    training.messageLog,
  ])
}

/**
 * Hook for components that only need to read state.
 * Uses Redux selectors for optimized re-renders.
 */
export { useAppSelector, useAppDispatch } from './hooks'
