'use client'

/**
 * Badge Component
 *
 * Small status indicator badges.
 */

import { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-gray-600 text-gray-200',
  success: 'bg-green-600/20 text-green-400 border border-green-600/30',
  warning: 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30',
  danger: 'bg-red-600/20 text-red-400 border border-red-600/30',
  info: 'bg-blue-600/20 text-blue-400 border border-blue-600/30',
  purple: 'bg-purple-600/20 text-purple-400 border border-purple-600/30',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${VARIANT_CLASSES[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
