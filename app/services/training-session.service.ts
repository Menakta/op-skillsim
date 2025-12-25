/**
 * Training Session Service
 *
 * Handles training session management and progress tracking.
 * Abstracts API calls for training session operations.
 */

import type {
  TrainingSession,
  StartTrainingRequest,
  UpdateProgressRequest,
  CompletePhaseRequest,
  CompleteTrainingRequest,
  TrainingSessionStatus,
} from '@/app/types'

// =============================================================================
// Types
// =============================================================================

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Training Session Service
// =============================================================================

export const trainingSessionService = {
  /**
   * Start a new training session or get existing active one
   */
  async startSession(
    request: StartTrainingRequest = {}
  ): Promise<ServiceResult<TrainingSession>> {
    try {
      const response = await fetch('/api/training/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(request),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to start training session',
        }
      }

      return {
        success: true,
        data: data.session,
      }
    } catch (error) {
      console.error('Training session service error:', error)
      return {
        success: false,
        error: 'Network error: Failed to start training session',
      }
    }
  },

  /**
   * Get current active training session
   */
  async getCurrentSession(): Promise<ServiceResult<TrainingSession | null>> {
    try {
      const response = await fetch('/api/training/session', {
        method: 'GET',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to get training session',
        }
      }

      return {
        success: true,
        data: data.session || null,
      }
    } catch (error) {
      console.error('Training session service error:', error)
      return {
        success: false,
        error: 'Network error: Failed to get training session',
      }
    }
  },

  /**
   * Update training progress
   */
  async updateProgress(
    request: UpdateProgressRequest
  ): Promise<ServiceResult<{ phase: string; progress: number }>> {
    try {
      const response = await fetch('/api/training/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(request),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to update progress',
        }
      }

      return {
        success: true,
        data: {
          phase: data.phase,
          progress: data.progress,
        },
      }
    } catch (error) {
      console.error('Training session service error:', error)
      return {
        success: false,
        error: 'Network error: Failed to update progress',
      }
    }
  },

  /**
   * Complete a training phase
   */
  async completePhase(
    request: CompletePhaseRequest
  ): Promise<ServiceResult<{ phasesCompleted: number; totalScore: number }>> {
    try {
      const response = await fetch('/api/training/phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(request),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to complete phase',
        }
      }

      return {
        success: true,
        data: {
          phasesCompleted: data.phasesCompleted,
          totalScore: data.totalScore,
        },
      }
    } catch (error) {
      console.error('Training session service error:', error)
      return {
        success: false,
        error: 'Network error: Failed to complete phase',
      }
    }
  },

  /**
   * Complete the entire training session
   */
  async completeTraining(
    request: CompleteTrainingRequest
  ): Promise<ServiceResult<TrainingSession>> {
    try {
      const response = await fetch('/api/training/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(request),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to complete training',
        }
      }

      return {
        success: true,
        data: data.session,
      }
    } catch (error) {
      console.error('Training session service error:', error)
      return {
        success: false,
        error: 'Network error: Failed to complete training',
      }
    }
  },

  /**
   * Update session status (pause, resume, abandon)
   */
  async updateStatus(
    status: TrainingSessionStatus
  ): Promise<ServiceResult<{ status: TrainingSessionStatus }>> {
    try {
      const response = await fetch('/api/training/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to update status',
        }
      }

      return {
        success: true,
        data: { status: data.status },
      }
    } catch (error) {
      console.error('Training session service error:', error)
      return {
        success: false,
        error: 'Network error: Failed to update status',
      }
    }
  },

  /**
   * Record time spent (call periodically or on pause/complete)
   */
  async recordTimeSpent(
    timeMs: number
  ): Promise<ServiceResult<{ totalTimeSpent: number }>> {
    try {
      const response = await fetch('/api/training/time', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ timeMs }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to record time',
        }
      }

      return {
        success: true,
        data: { totalTimeSpent: data.totalTimeSpent },
      }
    } catch (error) {
      console.error('Training session service error:', error)
      return {
        success: false,
        error: 'Network error: Failed to record time',
      }
    }
  },
}

export default trainingSessionService
