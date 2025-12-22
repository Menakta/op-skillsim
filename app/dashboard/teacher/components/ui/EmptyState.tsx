'use client'

/**
 * EmptyState Component
 *
 * Displayed when there's no data to show.
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
        <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      {description && (
        <p className="text-gray-400 text-sm text-center max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}
