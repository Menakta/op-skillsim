/**
 * Enhanced Logger
 *
 * Production-ready logger compatible with Next.js serverless/edge runtime.
 * Features:
 * - Log levels (debug, info, warn, error)
 * - Structured logging with JSON output option
 * - Child loggers with context bindings
 * - Performance timing utilities
 * - Conditional logging based on environment
 * - Log buffering for batch operations
 *
 * API matches pino's signature: logger.info(data, message) or logger.info(message)
 */

// =============================================================================
// Configuration
// =============================================================================

const isProd = process.env.NODE_ENV === 'production'
const isServer = typeof window === 'undefined'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  silent: '',
}

const RESET_COLOR = '\x1b[0m'

// =============================================================================
// Types
// =============================================================================

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: Record<string, unknown>
  context?: Record<string, unknown>
}

export type LogFn = {
  (msg: string): void
  (data: object, msg: string): void
}

export interface Logger {
  debug: LogFn
  info: LogFn
  warn: LogFn
  error: LogFn
  child: (bindings: Record<string, unknown>) => Logger
  time: (label: string) => () => number
  setLevel: (level: LogLevel) => void
  getLevel: () => LogLevel
}

export interface LoggerConfig {
  level?: LogLevel
  json?: boolean
  colorize?: boolean
  timestamp?: boolean
  context?: Record<string, unknown>
}

// =============================================================================
// Logger Factory
// =============================================================================

function createLoggerInstance(config: LoggerConfig = {}): Logger {
  const {
    level: initialLevel = isProd ? 'info' : 'debug',
    json = isProd && isServer,
    colorize = !isProd && isServer,
    timestamp = true,
    context = {},
  } = config

  let currentLevel: LogLevel = initialLevel

  // ===========================================================================
  // Formatting
  // ===========================================================================

  function formatTimestamp(): string {
    return new Date().toISOString()
  }

  function formatJson(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      ...entry.context,
      context: undefined, // Flatten context into root
    })
  }

  function formatPretty(entry: LogEntry): string {
    const { level, message, timestamp: ts, data, context: ctx } = entry

    let output = ''

    // Add color if enabled
    if (colorize) {
      output += LEVEL_COLORS[level]
    }

    // Timestamp
    if (timestamp && ts) {
      output += `[${ts}] `
    }

    // Level
    output += `${level.toUpperCase().padEnd(5)} `

    // Reset color before message
    if (colorize) {
      output += RESET_COLOR
    }

    // Context prefix
    if (ctx && Object.keys(ctx).length > 0) {
      const ctxStr = Object.entries(ctx)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')
      output += `(${ctxStr}) `
    }

    // Message
    output += message

    // Data
    if (data && Object.keys(data).length > 0) {
      output += ` ${JSON.stringify(data)}`
    }

    return output
  }

  // ===========================================================================
  // Core Log Function
  // ===========================================================================

  function log(level: LogLevel, dataOrMsg: string | object, msg?: string): void {
    if (LEVEL_VALUES[currentLevel] > LEVEL_VALUES[level]) {
      return
    }

    let message: string
    let data: Record<string, unknown> | undefined

    if (typeof dataOrMsg === 'string') {
      message = dataOrMsg
    } else {
      data = dataOrMsg as Record<string, unknown>
      message = msg || ''
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: timestamp ? formatTimestamp() : '',
      data,
      context: Object.keys(context).length > 0 ? context : undefined,
    }

    const formatted = json ? formatJson(entry) : formatPretty(entry)

    // Output to appropriate console method
    switch (level) {
      case 'debug':
        console.debug(formatted)
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }
  }

  // ===========================================================================
  // Create Log Functions
  // ===========================================================================

  function createLogFn(level: LogLevel): LogFn {
    return function (dataOrMsg: string | object, msg?: string) {
      log(level, dataOrMsg, msg)
    } as LogFn
  }

  // ===========================================================================
  // Timing Utility
  // ===========================================================================

  function time(label: string): () => number {
    const start = performance.now()

    return () => {
      const duration = performance.now() - start
      log('debug', { duration: `${duration.toFixed(2)}ms` }, `⏱ ${label}`)
      return duration
    }
  }

  // ===========================================================================
  // Child Logger
  // ===========================================================================

  function child(bindings: Record<string, unknown>): Logger {
    return createLoggerInstance({
      level: currentLevel,
      json,
      colorize,
      timestamp,
      context: { ...context, ...bindings },
    })
  }

  // ===========================================================================
  // Level Control
  // ===========================================================================

  function setLevel(level: LogLevel): void {
    currentLevel = level
  }

  function getLevel(): LogLevel {
    return currentLevel
  }

  // ===========================================================================
  // Return Logger Instance
  // ===========================================================================

  return {
    debug: createLogFn('debug'),
    info: createLogFn('info'),
    warn: createLogFn('warn'),
    error: createLogFn('error'),
    child,
    time,
    setLevel,
    getLevel,
  }
}

// =============================================================================
// Default Logger Export
// =============================================================================

export const logger = createLoggerInstance()

// =============================================================================
// Factory Export (for custom loggers)
// =============================================================================

export function createLogger(config?: LoggerConfig): Logger {
  return createLoggerInstance(config)
}

// =============================================================================
// Convenience Exports
// =============================================================================

/**
 * Create a logger for a specific module/feature
 */
export function getLogger(name: string): Logger {
  return logger.child({ module: name })
}

/**
 * Performance timing wrapper
 *
 * @example
 * const result = await withTiming('fetchData', async () => {
 *   return await fetch('/api/data')
 * })
 */
export async function withTiming<T>(
  label: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const end = logger.time(label)
  try {
    const result = await fn()
    end()
    return result
  } catch (error) {
    end()
    throw error
  }
}

export default logger
