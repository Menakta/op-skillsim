/**
 * Logger Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger, createLogger, getLogger } from '@/app/lib/logger'

describe('Logger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>
    info: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore())
  })

  describe('log levels', () => {
    it('should log info messages', () => {
      logger.info('Test info message')
      expect(consoleSpy.info).toHaveBeenCalled()
    })

    it('should log warn messages', () => {
      logger.warn('Test warn message')
      expect(consoleSpy.warn).toHaveBeenCalled()
    })

    it('should log error messages', () => {
      logger.error('Test error message')
      expect(consoleSpy.error).toHaveBeenCalled()
    })

    it('should log debug messages in development', () => {
      const devLogger = createLogger({ level: 'debug' })
      devLogger.debug('Test debug message')
      expect(consoleSpy.debug).toHaveBeenCalled()
    })
  })

  describe('structured logging', () => {
    it('should accept data object with message', () => {
      logger.info({ userId: '123', action: 'login' }, 'User logged in')
      expect(consoleSpy.info).toHaveBeenCalled()
      const logOutput = consoleSpy.info.mock.calls[0][0]
      expect(logOutput).toContain('User logged in')
    })

    it('should accept just a message string', () => {
      logger.info('Simple message')
      expect(consoleSpy.info).toHaveBeenCalled()
      const logOutput = consoleSpy.info.mock.calls[0][0]
      expect(logOutput).toContain('Simple message')
    })
  })

  describe('child loggers', () => {
    it('should create child logger with context', () => {
      const childLogger = logger.child({ module: 'auth' })
      childLogger.info('Auth event')

      expect(consoleSpy.info).toHaveBeenCalled()
      const logOutput = consoleSpy.info.mock.calls[0][0]
      expect(logOutput).toContain('module=auth')
    })

    it('should merge context in nested child loggers', () => {
      const childLogger = logger.child({ module: 'auth' })
      const grandchildLogger = childLogger.child({ action: 'login' })
      grandchildLogger.info('Login attempt')

      expect(consoleSpy.info).toHaveBeenCalled()
      const logOutput = consoleSpy.info.mock.calls[0][0]
      expect(logOutput).toContain('module=auth')
      expect(logOutput).toContain('action=login')
    })
  })

  describe('getLogger()', () => {
    it('should create a named logger', () => {
      const namedLogger = getLogger('streaming')
      namedLogger.info('Stream event')

      expect(consoleSpy.info).toHaveBeenCalled()
      const logOutput = consoleSpy.info.mock.calls[0][0]
      expect(logOutput).toContain('module=streaming')
    })
  })

  describe('level control', () => {
    it('should respect log level settings', () => {
      const restrictedLogger = createLogger({ level: 'error' })

      restrictedLogger.debug('Debug message')
      restrictedLogger.info('Info message')
      restrictedLogger.warn('Warn message')
      restrictedLogger.error('Error message')

      expect(consoleSpy.debug).not.toHaveBeenCalled()
      expect(consoleSpy.info).not.toHaveBeenCalled()
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalled()
    })

    it('should allow changing log level at runtime', () => {
      const dynamicLogger = createLogger({ level: 'error' })

      dynamicLogger.info('Should not log')
      expect(consoleSpy.info).not.toHaveBeenCalled()

      dynamicLogger.setLevel('info')
      dynamicLogger.info('Should log now')
      expect(consoleSpy.info).toHaveBeenCalled()
    })

    it('should report current log level', () => {
      const testLogger = createLogger({ level: 'warn' })
      expect(testLogger.getLevel()).toBe('warn')

      testLogger.setLevel('debug')
      expect(testLogger.getLevel()).toBe('debug')
    })
  })

  describe('JSON formatting', () => {
    it('should output JSON when configured', () => {
      const jsonLogger = createLogger({ json: true })
      jsonLogger.info({ key: 'value' }, 'JSON log')

      expect(consoleSpy.info).toHaveBeenCalled()
      const logOutput = consoleSpy.info.mock.calls[0][0]

      // Should be valid JSON
      expect(() => JSON.parse(logOutput)).not.toThrow()
    })
  })

  describe('timing', () => {
    it('should measure execution time', () => {
      const testLogger = createLogger({ level: 'debug' })
      const endTimer = testLogger.time('test-operation')

      // Simulate some work
      const duration = endTimer()

      expect(typeof duration).toBe('number')
      expect(consoleSpy.debug).toHaveBeenCalled()
    })
  })
})
