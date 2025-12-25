/**
 * useFittingOptions Hook
 *
 * Fetches and manages fitting options from Supabase.
 * Provides pipe types for training components.
 */

import { useState, useEffect, useCallback } from 'react'
import { fittingService, type PipeTypeOption } from '@/app/services'

// =============================================================================
// Types
// =============================================================================

export interface UseFittingOptionsReturn {
  /** All pipe types (correct fittings only) */
  pipeTypes: PipeTypeOption[]
  /** All fitting options including distractors */
  allOptions: PipeTypeOption[]
  /** Loading state */
  loading: boolean
  /** Error message if any */
  error: string | null
  /** Refresh the fitting options */
  refresh: () => Promise<void>
  /** Get a fitting by ID */
  getFittingById: (id: string) => PipeTypeOption | undefined
}

// =============================================================================
// Hook
// =============================================================================

export function useFittingOptions(): UseFittingOptionsReturn {
  const [pipeTypes, setPipeTypes] = useState<PipeTypeOption[]>([])
  const [allOptions, setAllOptions] = useState<PipeTypeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFittings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch both pipe types and all options in parallel
      const [pipes, all] = await Promise.all([
        fittingService.getPipeTypes(),
        fittingService.getAllPipeOptions(),
      ])

      setPipeTypes(pipes)
      setAllOptions(all)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load fitting options'
      setError(message)
      console.error('[useFittingOptions] Error:', message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    loadFittings()
  }, [loadFittings])

  const refresh = useCallback(async () => {
    fittingService.clearCache()
    await loadFittings()
  }, [loadFittings])

  const getFittingById = useCallback(
    (id: string): PipeTypeOption | undefined => {
      return allOptions.find(option => option.id === id)
    },
    [allOptions]
  )

  return {
    pipeTypes,
    allOptions,
    loading,
    error,
    refresh,
    getFittingById,
  }
}
