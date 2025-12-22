'use client'

/**
 * Redux Store Provider
 *
 * Wraps the application with the Redux store provider.
 * Must be a client component since Redux uses React context.
 */

import { Provider } from 'react-redux'
import { store } from './index'

interface StoreProviderProps {
  children: React.ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
  return <Provider store={store}>{children}</Provider>
}
