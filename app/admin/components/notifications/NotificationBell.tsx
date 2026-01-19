'use client'

/**
 * NotificationBell Component
 *
 * Displays a bell icon with unread notification count badge.
 * Subscribes to real-time notifications via Supabase Realtime.
 * Shows a dropdown panel with recent notifications.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { Bell, Check, CheckCheck, X, UserPlus, Mail } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'
import { notificationService } from '../../services/notification.service'
import type { AdminNotification } from '../../types'

interface NotificationBellProps {
  /** Whether the current user is an admin (only admins see notifications) */
  isAdmin: boolean
}

export function NotificationBell({ isAdmin }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch notifications on mount
  const fetchNotifications = useCallback(async () => {
    if (!isAdmin) return

    setIsLoading(true)
    const result = await notificationService.getNotifications()
    if (result.success && result.data) {
      setNotifications(result.data)
      setUnreadCount(result.data.filter(n => !n.is_read).length)
    }
    setIsLoading(false)
  }, [isAdmin])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!isAdmin) return

    const supabase = createClient()

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          const newNotification = payload.new as AdminNotification
          console.log('🔔 New notification received:', newNotification)

          // Add to the top of the list
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)

          // Show toast notification
          showToast(newNotification.message)
        }
      )
      .subscribe((status) => {
        console.log('📡 Notification channel status:', status)
      })

    return () => {
      console.log('📡 Unsubscribing from notification channel')
      supabase.removeChannel(channel)
    }
  }, [isAdmin])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Show toast notification
  const showToast = (message: string) => {
    setToast({ message, visible: true })
    setTimeout(() => {
      setToast(prev => prev ? { ...prev, visible: false } : null)
    }, 5000)
  }

  // Mark single notification as read
  const handleMarkAsRead = async (id: string) => {
    const result = await notificationService.markAsRead(id)
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    const result = await notificationService.markAllAsRead()
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }

  // Get icon based on notification message
  const getNotificationIcon = (message: string) => {
    if (message.includes('signed up') || message.includes('registered')) {
      return <UserPlus className="w-4 h-4 text-blue-500" />
    }
    if (message.includes('verified')) {
      return <Mail className="w-4 h-4 text-green-500" />
    }
    return <Bell className="w-4 h-4 text-gray-500" />
  }

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Don't render for non-admins
  if (!isAdmin) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-colors theme-btn-ghost"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 max-h-[70vh] overflow-hidden rounded-lg shadow-xl border theme-bg-secondary theme-border z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b theme-border">
            <h3 className="font-semibold theme-text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-[#39BEAE] hover:text-[#39BEAE]/80 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-[#39BEAE] border-t-transparent rounded-full" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Bell className="w-10 h-10 theme-text-muted mb-2" />
                <p className="theme-text-muted text-sm">No notifications yet</p>
                <p className="theme-text-muted text-xs mt-1">
                  You&apos;ll be notified when users register or verify their email
                </p>
              </div>
            ) : (
              <ul className="divide-y theme-divide">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`px-4 py-3 hover:theme-bg-hover transition-colors ${
                      !notification.is_read ? 'bg-[#39BEAE]/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.message)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.is_read ? 'font-medium theme-text-primary' : 'theme-text-secondary'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs theme-text-muted mt-1">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                          className="flex-shrink-0 p-1 rounded hover:bg-[#39BEAE]/10 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4 text-[#39BEAE]" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 max-w-sm p-4 rounded-lg shadow-lg border theme-bg-secondary theme-border transition-all duration-300 z-[100] ${
            toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Bell className="w-5 h-5 text-[#39BEAE]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium theme-text-primary">New Notification</p>
              <p className="text-sm theme-text-secondary mt-1">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(prev => prev ? { ...prev, visible: false } : null)}
              className="flex-shrink-0 p-1 rounded hover:theme-bg-hover"
            >
              <X className="w-4 h-4 theme-text-muted" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
