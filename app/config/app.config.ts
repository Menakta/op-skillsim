/**
 * App Configuration
 *
 * Centralized application-wide settings and constants.
 */

// =============================================================================
// PureWeb Configuration
// =============================================================================

export const PUREWEB_CONFIG = {
  endpoint: 'https://api.pureweb.io',
  projectId: '94adc3ba-7020-49f0-9a7c-bb8f1531536a',
  modelId: '26c1dfea-9845-46bb-861d-fb90a22b28df',
}

// =============================================================================
// Retry Configuration
// =============================================================================

export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds between retries
  connectionTimeout: 30000, // 30 seconds
}

// =============================================================================
// UI Configuration
// =============================================================================

export const UI_CONFIG = {
  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 100,
    modal: 200,
    overlay: 300,
    tooltip: 400,
    notification: 500,
    highest: 999,
  },

  // Animation durations (ms)
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  // Debounce delays (ms)
  debounce: {
    input: 300,
    search: 500,
    resize: 100,
  },

  // Message log
  messageLog: {
    maxEntries: 100,
  },
}

// =============================================================================
// Training Configuration
// =============================================================================

export const TRAINING_CONFIG = {
  totalTasks: 6,
  autoAdvanceDelay: 1000, // 1 second delay before auto-advancing
  questionMaxTries: 3,
}

// =============================================================================
// Theme Configuration
// =============================================================================

export const THEME_CONFIG = {
  defaultTheme: 'dark' as const,
  storageKey: 'op-skillsim-theme',
}

// =============================================================================
// API Endpoints
// =============================================================================

export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    validate: '/api/auth/validate',
    ltiLaunch: '/api/lti/launch',
    sessionRequest: '/api/auth/session-request',
  },
  stream: {
    create: '/api/stream/create',
    credentials: '/api/stream/credentials',
    agentToken: '/api/stream/agent-token',
  },
}

// =============================================================================
// Environment Helpers
// =============================================================================

export const ENV = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
}

// =============================================================================
// Debug Configuration
// =============================================================================

export const DEBUG_CONFIG = {
  enabled: ENV.isDevelopment,
  logMessages: ENV.isDevelopment,
  logStateChanges: ENV.isDevelopment,
}
