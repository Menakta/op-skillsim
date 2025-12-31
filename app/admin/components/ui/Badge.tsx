'use client'

/**
 * Badge Component
 *
 * Small status indicator badges.
 * Uses global theme classes - no isDark checks needed.
 */

import { ReactNode } from 'react'
import type { BadgeVariant } from '../../types'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'theme-badge',
  success: 'theme-badge-success border theme-border-success',
  warning: 'theme-badge-warning border theme-border-warning',
  danger: 'theme-badge-error border theme-border-error',
  info: 'theme-badge-info border theme-border-info',
  purple: 'theme-badge-brand border border-purple-600/30',
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
