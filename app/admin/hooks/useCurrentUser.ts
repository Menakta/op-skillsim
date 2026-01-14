/**
 * useCurrentUser Hook
 *
 * Hook to get current user info from session cookie.
 * Used to determine if user can perform admin actions like delete.
 */

import { useEffect, useState } from 'react'

interface CurrentUser {
  role: 'student' | 'teacher' | 'admin'
  isLti: boolean
  email: string
  userId: string
}

/**
 * Get current user info from the session API
 */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const data = await response.json()
          // The session API returns { session: { ... } } structure
          if (data.session) {
            setUser({
              role: data.session.role,
              isLti: data.session.isLti || false,
              email: data.session.email || '',
              userId: data.session.userId || '',
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { user, isLoading }
}

/**
 * Check if the current user is an LTI admin (can delete)
 */
export function useIsLtiAdmin() {
  const { user, isLoading } = useCurrentUser()

  return {
    isLtiAdmin: user?.role === 'admin' && user?.isLti === true,
    isLoading,
    user,
  }
}
