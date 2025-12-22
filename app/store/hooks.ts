/**
 * Redux Hooks
 *
 * Typed hooks for use throughout the application.
 * Use these instead of plain `useDispatch` and `useSelector`.
 */

import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './index'

// Typed dispatch hook
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()

// Typed selector hook
export const useAppSelector = useSelector.withTypes<RootState>()
