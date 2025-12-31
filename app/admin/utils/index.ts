/**
 * Admin Utils
 *
 * Shared utility functions for admin pages.
 */

/**
 * Format a date string to a human-readable format
 */
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format seconds to a human-readable time string
 */
export function formatTime(seconds: number): string {
  if (!seconds || seconds === 0) return '0s'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}

/**
 * Format milliseconds to a human-readable time string
 */
export function formatTimeMs(ms: number): string {
  if (!ms || ms === 0) return '0s'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

/**
 * Format a timestamp to a relative time string (e.g., "2h ago")
 */
export function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

/**
 * Get initials from a name
 */
export function getInitials(name: string, maxLength = 2): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, maxLength)
    .toUpperCase()
}

/**
 * Format a phase string to title case with spaces
 */
export function formatPhase(phase: string): string {
  return phase
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}
