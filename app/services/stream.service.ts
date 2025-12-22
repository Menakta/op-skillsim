/**
 * Stream Service
 *
 * Handles all streaming-related API calls and business logic.
 * Abstracts the API layer from components.
 */

// =============================================================================
// Types
// =============================================================================

export interface StreamCredentials {
  projectId: string
  modelId: string
  environmentId: string
}

export interface StreamCreateResponse {
  streamUrl: string
}

export interface ServiceError {
  error: string
  status?: number
}

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: ServiceError }

// =============================================================================
// Stream Service
// =============================================================================

export const streamService = {
  /**
   * Get stream credentials for PureWeb connection
   */
  async getCredentials(): Promise<ServiceResult<StreamCredentials>> {
    try {
      const response = await fetch('/api/stream/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        return {
          success: false,
          error: { error: error.error || 'Failed to get credentials', status: response.status },
        }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: { error: 'Network error: Failed to connect to server' },
      }
    }
  },

  /**
   * Create a new stream session
   */
  async createStream(): Promise<ServiceResult<StreamCreateResponse>> {
    try {
      const response = await fetch('/api/stream/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        return {
          success: false,
          error: { error: error.error || 'Failed to create stream', status: response.status },
        }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: { error: 'Network error: Failed to connect to server' },
      }
    }
  },

  /**
   * Get agent token for existing environment
   */
  async getAgentToken(environmentId: string): Promise<ServiceResult<{ accessToken: string }>> {
    try {
      const response = await fetch('/api/stream/agent-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ environmentId }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        return {
          success: false,
          error: { error: error.error || 'Failed to get agent token', status: response.status },
        }
      }

      const data = await response.json()
      return { success: true, data: { accessToken: data.accessToken } }
    } catch (error) {
      return {
        success: false,
        error: { error: 'Network error: Failed to connect to server' },
      }
    }
  },
}

export default streamService
