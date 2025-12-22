/**
 * EventBus Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eventBus } from '@/app/lib/events'

describe('EventBus', () => {
  beforeEach(() => {
    // Clear all listeners before each test
    eventBus.clear()
  })

  describe('on()', () => {
    it('should subscribe to an event', () => {
      const callback = vi.fn()
      eventBus.on('training:started', callback)

      eventBus.emit('training:started', { taskIndex: 0 })

      expect(callback).toHaveBeenCalledWith({ taskIndex: 0 }, 'training:started')
    })

    it('should allow multiple subscribers to the same event', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      eventBus.on('training:started', callback1)
      eventBus.on('training:started', callback2)

      eventBus.emit('training:started', { taskIndex: 1 })

      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })

    it('should return an unsubscribe function', () => {
      const callback = vi.fn()
      const subscription = eventBus.on('training:started', callback)

      subscription.unsubscribe()
      eventBus.emit('training:started', { taskIndex: 0 })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('once()', () => {
    it('should only fire callback once', () => {
      const callback = vi.fn()
      eventBus.once('stream:connected', callback)

      eventBus.emit('stream:connected', { environmentId: 'env-1' })
      eventBus.emit('stream:connected', { environmentId: 'env-2' })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({ environmentId: 'env-1' }, 'stream:connected')
    })
  })

  describe('off()', () => {
    it('should remove a specific listener', () => {
      const callback = vi.fn()
      eventBus.on('ui:modalOpened', callback)
      eventBus.off('ui:modalOpened', callback)

      eventBus.emit('ui:modalOpened', { modalId: 'test' })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('emit()', () => {
    it('should emit event data to listeners', () => {
      const callback = vi.fn()
      eventBus.on('tool:selected', callback)

      eventBus.emit('tool:selected', { toolName: 'XRay', previousTool: 'None' })

      expect(callback).toHaveBeenCalledWith(
        { toolName: 'XRay', previousTool: 'None' },
        'tool:selected'
      )
    })

    it('should not fail when emitting with no listeners', () => {
      expect(() => {
        eventBus.emit('training:paused', undefined)
      }).not.toThrow()
    })
  })

  describe('wildcard subscriptions', () => {
    it('should match namespace wildcards', () => {
      const callback = vi.fn()
      eventBus.on('training:*' as any, callback)

      eventBus.emit('training:started', { taskIndex: 0 })
      eventBus.emit('training:completed', { totalTasks: 5 })

      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('should match global wildcard', () => {
      const callback = vi.fn()
      eventBus.on('*' as any, callback)

      eventBus.emit('training:started', { taskIndex: 0 })
      eventBus.emit('stream:connected', { environmentId: 'test' })

      expect(callback).toHaveBeenCalledTimes(2)
    })
  })

  describe('clear()', () => {
    it('should remove all listeners for a specific event', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      eventBus.on('training:started', callback1)
      eventBus.on('stream:connected', callback2)

      eventBus.clear('training:started')

      eventBus.emit('training:started', { taskIndex: 0 })
      eventBus.emit('stream:connected', { environmentId: 'test' })

      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })

    it('should remove all listeners when called without arguments', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      eventBus.on('training:started', callback1)
      eventBus.on('stream:connected', callback2)

      eventBus.clear()

      eventBus.emit('training:started', { taskIndex: 0 })
      eventBus.emit('stream:connected', { environmentId: 'test' })

      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).not.toHaveBeenCalled()
    })
  })

  describe('listenerCount()', () => {
    it('should return the number of listeners for an event', () => {
      eventBus.on('training:started', vi.fn())
      eventBus.on('training:started', vi.fn())
      eventBus.on('stream:connected', vi.fn())

      expect(eventBus.listenerCount('training:started')).toBe(2)
      expect(eventBus.listenerCount('stream:connected')).toBe(1)
      expect(eventBus.listenerCount('ui:modalOpened')).toBe(0)
    })
  })

  describe('error handling', () => {
    it('should catch errors in listeners without affecting other listeners', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error')
      })
      const successCallback = vi.fn()

      eventBus.on('training:started', errorCallback)
      eventBus.on('training:started', successCallback)

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      eventBus.emit('training:started', { taskIndex: 0 })

      expect(errorCallback).toHaveBeenCalled()
      expect(successCallback).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
