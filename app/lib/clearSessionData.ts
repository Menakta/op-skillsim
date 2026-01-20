/**
 * Clear Session Data Utility
 *
 * Clears all session-related data from localStorage and cookies.
 * Used when session ends (completion, expiry, logout).
 */

// =============================================================================
// Cookie Helpers
// =============================================================================

/**
 * Delete a cookie by name
 */
function deleteCookie(name: string): void {
  // Delete with various path combinations to ensure removal
  const paths = ['/', '/admin', '/api']
  const domains = [window.location.hostname, '']

  for (const path of paths) {
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domain ? `; domain=${domain}` : ''}`
    }
  }
}

/**
 * Get all cookie names
 */
function getAllCookieNames(): string[] {
  return document.cookie
    .split(';')
    .map(cookie => cookie.trim().split('=')[0])
    .filter(name => name.length > 0)
}

// =============================================================================
// LocalStorage Keys to Clear
// =============================================================================

const LOCAL_STORAGE_KEYS_TO_CLEAR = [
  // Theme
  'op-skillsim-theme',
  // Training state
  'op-skillsim-training-state',
  'training-session-id',
  // Redux persist (if used)
  'persist:root',
  'persist:training',
  // Any other app-specific keys
  'op-skillsim-',
]

// =============================================================================
// Session Storage Keys to Clear
// =============================================================================

const SESSION_STORAGE_KEYS_TO_CLEAR = [
  'op-skillsim-',
  'training-',
  'session-',
]

// =============================================================================
// Cookies to Clear
// =============================================================================

const COOKIES_TO_CLEAR = [
  'session_token',
  'sb-access-token',
  'sb-refresh-token',
]

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Clear all localStorage data related to the app
 */
export function clearLocalStorage(): void {
  try {
    // Clear specific known keys
    for (const key of LOCAL_STORAGE_KEYS_TO_CLEAR) {
      if (key.endsWith('-')) {
        // Prefix match - clear all keys starting with this prefix
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i)
          if (storageKey && storageKey.startsWith(key)) {
            keysToRemove.push(storageKey)
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k))
      } else {
        localStorage.removeItem(key)
      }
    }
    console.log('✅ LocalStorage cleared')
  } catch (error) {
    console.error('Failed to clear localStorage:', error)
  }
}

/**
 * Clear all sessionStorage data related to the app
 */
export function clearSessionStorage(): void {
  try {
    // Clear specific known keys
    for (const key of SESSION_STORAGE_KEYS_TO_CLEAR) {
      if (key.endsWith('-')) {
        // Prefix match - clear all keys starting with this prefix
        const keysToRemove: string[] = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const storageKey = sessionStorage.key(i)
          if (storageKey && storageKey.startsWith(key)) {
            keysToRemove.push(storageKey)
          }
        }
        keysToRemove.forEach(k => sessionStorage.removeItem(k))
      } else {
        sessionStorage.removeItem(key)
      }
    }
    console.log('✅ SessionStorage cleared')
  } catch (error) {
    console.error('Failed to clear sessionStorage:', error)
  }
}

/**
 * Clear all session-related cookies
 */
export function clearCookies(): void {
  try {
    // Clear known session cookies
    for (const cookieName of COOKIES_TO_CLEAR) {
      deleteCookie(cookieName)
    }

    // Also try to clear any Supabase cookies (they have dynamic names)
    const allCookies = getAllCookieNames()
    for (const cookieName of allCookies) {
      if (
        cookieName.startsWith('sb-') ||
        cookieName.includes('supabase') ||
        cookieName === 'session_token'
      ) {
        deleteCookie(cookieName)
      }
    }

    console.log('✅ Cookies cleared')
  } catch (error) {
    console.error('Failed to clear cookies:', error)
  }
}

/**
 * Clear all session data (localStorage, sessionStorage, and cookies)
 */
export function clearAllSessionData(): void {
  console.log('🧹 Clearing all session data...')
  clearLocalStorage()
  clearSessionStorage()
  clearCookies()
  console.log('✅ All session data cleared')
}

/**
 * Call the server-side logout API to invalidate the session
 */
export async function serverLogout(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })

    if (response.ok) {
      console.log('✅ Server session invalidated')
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to logout from server:', error)
    return false
  }
}

/**
 * Complete session cleanup - clears client data and invalidates server session
 */
export async function completeSessionCleanup(): Promise<void> {
  // Clear client-side data first
  clearAllSessionData()

  // Then invalidate server session
  await serverLogout()
}
