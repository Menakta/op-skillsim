/**
 * Admin Notification Types
 *
 * Type definitions for the admin notification system.
 */

export interface AdminNotification {
  id: string
  user_id: string | null
  message: string
  is_read: boolean
  created_at: string
}

export interface NotificationWithUser extends AdminNotification {
  user_profile?: {
    email: string
    full_name: string | null
    registration_type: string
    approval_status: string
  } | null
}

export type NotificationEventType = 'INSERT' | 'UPDATE' | 'DELETE'

export interface RealtimeNotificationPayload {
  eventType: NotificationEventType
  new: AdminNotification
  old: AdminNotification | null
}
