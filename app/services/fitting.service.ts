/**
 * Fitting Options Service
 *
 * Fetches fitting options from Supabase for use in training components.
 * Provides both raw options and formatted pipe types for UI components.
 */

import type { FittingOption } from '@/app/types'

// =============================================================================
// Types
// =============================================================================

export interface PipeTypeOption {
  id: string
  label: string
  icon: string
  description: string | null
  isCorrect: boolean
}

export interface FittingServiceResponse {
  success: boolean
  fittings: FittingOption[]
  error?: string
}

// =============================================================================
// Service
// =============================================================================

class FittingService {
  private cache: FittingOption[] | null = null
  private cacheExpiry: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  /**
   * Fetch all fitting options from the API
   */
  async getFittingOptions(): Promise<FittingOption[]> {
    // Check cache
    if (this.cache && Date.now() < this.cacheExpiry) {
      return this.cache
    }

    try {
      const response = await fetch('/api/fittings')

      if (!response.ok) {
        throw new Error('Failed to fetch fitting options')
      }

      const data: FittingServiceResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch fitting options')
      }

      // Update cache
      this.cache = data.fittings || []
      this.cacheExpiry = Date.now() + this.CACHE_DURATION

      return this.cache
    } catch (error) {
      console.error('[FittingService] Error fetching fittings:', error)
      // Return cached data if available, even if expired
      if (this.cache) {
        return this.cache
      }
      throw error
    }
  }

  /**
   * Get fitting options formatted for pipe selection UI
   * Returns only correct fittings (actual pipe types, not distractors)
   */
  async getPipeTypes(): Promise<PipeTypeOption[]> {
    const fittings = await this.getFittingOptions()

    return fittings
      .filter(f => f.is_correct) // Only correct fittings are actual pipe types
      .map(f => ({
        id: f.fitting_id,
        label: f.name,
        icon: f.image_url || '/icons/pipe.png', // Default icon if none set
        description: f.description,
        isCorrect: f.is_correct,
      }))
  }

  /**
   * Get all fitting options formatted for UI (including distractors)
   * Useful for quiz/question scenarios
   */
  async getAllPipeOptions(): Promise<PipeTypeOption[]> {
    const fittings = await this.getFittingOptions()

    return fittings.map(f => ({
      id: f.fitting_id,
      label: f.name,
      icon: f.image_url || '/icons/pipe.png',
      description: f.description,
      isCorrect: f.is_correct,
    }))
  }

  /**
   * Get a specific fitting by ID
   */
  async getFittingById(fittingId: string): Promise<FittingOption | undefined> {
    const fittings = await this.getFittingOptions()
    return fittings.find(f => f.fitting_id === fittingId)
  }

  /**
   * Clear the cache (useful after updates)
   */
  clearCache(): void {
    this.cache = null
    this.cacheExpiry = 0
  }
}

// Export singleton instance
export const fittingService = new FittingService()
