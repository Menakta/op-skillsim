/**
 * Redux Store Configuration
 *
 * Central store for OP SkillSim application state.
 * Uses Redux Toolkit for simplified Redux setup.
 */

import { configureStore } from '@reduxjs/toolkit'
import trainingReducer from './slices/trainingSlice'
import uiReducer from './slices/uiSlice'
import connectionReducer from './slices/connectionSlice'

export const store = configureStore({
  reducer: {
    training: trainingReducer,
    ui: uiReducer,
    connection: connectionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in specific paths
        ignoredActions: ['connection/setMessageLog'],
        ignoredPaths: ['connection.messageLog'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

// Infer types from store
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Re-export everything for convenience
export * from './slices/trainingSlice'
export * from './slices/uiSlice'
export * from './slices/connectionSlice'
export * from './hooks'
