/**
 * Admin Notification Service
 *
 * Service layer for admin notification operations.
 * Handles fetching, marking as read, and real-time subscriptions.
 */

import type { AdminNotification } from '../types'

interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Fetch all notifications for the admin
 */
export async function getNotifications(): Promise<ServiceResult<AdminNotification[]>> {
  try {
    const response = await fetch('/api/admin/notifications')
    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to fetch notifications' }
    }

    return { success: true, data: data.notifications }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return { success: false, error: 'Network error fetching notifications' }
  }
}

/**
 * Get count of unread notifications
 */
export async function getUnreadCount(): Promise<ServiceResult<number>> {
  try {
    const response = await fetch('/api/admin/notifications/unread-count')
    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to fetch unread count' }
    }

    return { success: true, data: data.count }
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return { success: false, error: 'Network error fetching unread count' }
  }
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string): Promise<ServiceResult<void>> {
  try {
    const response = await fetch(`/api/admin/notifications/${notificationId}/read`, {
      method: 'PATCH',
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Failed to mark notification as read' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return { success: false, error: 'Network error marking notification as read' }
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<ServiceResult<void>> {
  try {
    const response = await fetch('/api/admin/notifications/mark-all-read', {
      method: 'PATCH',
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Failed to mark all as read' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error marking all as read:', error)
    return { success: false, error: 'Network error marking all as read' }
  }
}

export const notificationService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
}
