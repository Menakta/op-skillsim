'use client'

/**
 * EmptyState Component
 *
 * Displayed when there's no data to show.
 * Uses global theme classes - no isDark checks needed.
 */

import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      {icon && (
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 theme-bg-tertiary">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium mb-2 theme-text-primary">{title}</h3>
      {description && (
        <p className="text-sm text-center max-w-sm mb-4 theme-text-muted">{description}</p>
      )}
      {action}
    </div>
  )
}
