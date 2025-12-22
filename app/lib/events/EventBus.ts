/**
 * EventBus - Centralized Pub/Sub Event System
 *
 * A type-safe event bus for decoupled cross-feature communication.
 * Supports typed events, wildcards, and one-time listeners.
 *
 * @example
 * // Subscribe to events
 * eventBus.on('training:started', (data) => console.log(data))
 *
 * // Emit events
 * eventBus.emit('training:started', { taskIndex: 0 })
 *
 * // One-time listener
 * eventBus.once('stream:connected', () => initializeUI())
 *
 * // Wildcard subscription
 * eventBus.on('training:*', (data, eventName) => logAllTrainingEvents(eventName, data))
 */

// =============================================================================
// Types
// =============================================================================

export type EventCallback<T = unknown> = (data: T, eventName?: string) => void

export interface EventSubscription {
  unsubscribe: () => void
}

interface EventListener<T = unknown> {
  callback: EventCallback<T>
  once: boolean
}

// =============================================================================
// Event Definitions - Define your app events here
// =============================================================================

export interface AppEvents {
  // Training events
  'training:started': { taskIndex: number }
  'training:paused': undefined
  'training:resumed': undefined
  'training:completed': { totalTasks: number; score?: number }
  'training:taskChanged': { taskIndex: number; taskName: string; toolName: string }
  'training:progressUpdated': { progress: number; currentTask: number; totalTasks: number }

  // Tool events
  'tool:selected': { toolName: string; previousTool?: string }
  'tool:used': { toolName: string; success: boolean }

  // Stream events
  'stream:connecting': undefined
  'stream:connected': { environmentId: string }
  'stream:disconnected': { reason?: string }
  'stream:error': { error: string; code?: number }
  'stream:reconnecting': { attempt: number; maxAttempts: number }

  // UI events
  'ui:modalOpened': { modalId: string }
  'ui:modalClosed': { modalId: string }
  'ui:themeChanged': { theme: 'light' | 'dark' }
  'ui:screenChanged': { screen: string }

  // Question events
  'question:asked': { questionId: string }
  'question:answered': { questionId: string; correct: boolean; attempts: number }
  'question:skipped': { questionId: string }

  // Camera events
  'camera:perspectiveChanged': { perspective: string }
  'camera:modeChanged': { mode: 'Manual' | 'Orbit' }
  'camera:reset': undefined

  // Layer events
  'layer:toggled': { layerName: string; visible: boolean }
  'layer:isolated': { layerName: string }
  'layer:allShown': undefined
  'layer:allHidden': undefined

  // Session events
  'session:started': { userId?: string }
  'session:ended': { reason: string }
  'session:expired': undefined

  // Generic/Debug events
  'debug:log': { message: string; level: 'info' | 'warn' | 'error' }
}

// Event name type (includes wildcards)
export type AppEventName = keyof AppEvents | `${string}:*` | '*'

// =============================================================================
// EventBus Class
// =============================================================================

class EventBusImpl {
  private listeners: Map<string, Set<EventListener>> = new Map()
  private debugMode: boolean = false

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled
  }

  /**
   * Subscribe to an event
   */
  on<K extends keyof AppEvents>(
    event: K,
    callback: EventCallback<AppEvents[K]>
  ): EventSubscription
  on(event: string, callback: EventCallback): EventSubscription
  on(event: string, callback: EventCallback): EventSubscription {
    return this.addListener(event, callback, false)
  }

  /**
   * Subscribe to an event (one-time only)
   */
  once<K extends keyof AppEvents>(
    event: K,
    callback: EventCallback<AppEvents[K]>
  ): EventSubscription
  once(event: string, callback: EventCallback): EventSubscription
  once(event: string, callback: EventCallback): EventSubscription {
    return this.addListener(event, callback, true)
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof AppEvents>(
    event: K,
    callback: EventCallback<AppEvents[K]>
  ): void
  off(event: string, callback: EventCallback): void
  off(event: string, callback: EventCallback): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        if (listener.callback === callback) {
          listeners.delete(listener)
        }
      })
      if (listeners.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  /**
   * Emit an event
   */
  emit<K extends keyof AppEvents>(event: K, data: AppEvents[K]): void
  emit(event: string, data?: unknown): void
  emit(event: string, data?: unknown): void {
    if (this.debugMode) {
      console.log(`📢 EventBus: ${event}`, data)
    }

    // Direct listeners
    this.notifyListeners(event, data, event)

    // Wildcard listeners (e.g., 'training:*' matches 'training:started')
    const [namespace] = event.split(':')
    if (namespace) {
      this.notifyListeners(`${namespace}:*`, data, event)
    }

    // Global wildcard listeners
    this.notifyListeners('*', data, event)
  }

  /**
   * Remove all listeners for an event (or all events)
   */
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0
  }

  /**
   * Get all registered event names
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys())
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private addListener(
    event: string,
    callback: EventCallback,
    once: boolean
  ): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    const listener: EventListener = { callback, once }
    this.listeners.get(event)!.add(listener)

    return {
      unsubscribe: () => {
        const listeners = this.listeners.get(event)
        if (listeners) {
          listeners.delete(listener)
          if (listeners.size === 0) {
            this.listeners.delete(event)
          }
        }
      }
    }
  }

  private notifyListeners(
    eventKey: string,
    data: unknown,
    originalEvent: string
  ): void {
    const listeners = this.listeners.get(eventKey)
    if (!listeners) return

    const toRemove: EventListener[] = []

    listeners.forEach(listener => {
      try {
        listener.callback(data, originalEvent)
        if (listener.once) {
          toRemove.push(listener)
        }
      } catch (error) {
        console.error(`EventBus: Error in listener for "${eventKey}":`, error)
      }
    })

    // Remove one-time listeners
    toRemove.forEach(listener => listeners.delete(listener))
    if (listeners.size === 0) {
      this.listeners.delete(eventKey)
    }
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const eventBus = new EventBusImpl()

// Enable debug mode in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // @ts-ignore - Expose for debugging
  window.__eventBus = eventBus
}

export default eventBus
