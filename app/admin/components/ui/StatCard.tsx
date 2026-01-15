'use client'

/**
 * StatCard Component
 *
 * Displays a single statistic with icon and label.
 * Uses global theme classes - no isDark checks needed.
 */

import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'default' | 'green' | 'blue' | 'yellow' | 'purple' | 'red'
}

const COLOR_CLASSES = {
  default: 'theme-text-primary',
  green: 'theme-text-success',
  blue: 'theme-text-info',
  yellow: 'theme-text-warning',
  purple: 'theme-text-brand',
  red: 'theme-text-error',
}

const ICON_BG_CLASSES = {
  default: 'theme-bg-tertiary',
  green: 'theme-bg-success',
  blue: 'theme-bg-info',
  yellow: 'theme-bg-warning',
  purple: 'theme-bg-brand-muted',
  red: 'theme-bg-error',
}

export function StatCard({ label, value, icon, trend, color = 'default' }: StatCardProps) {
  return (
    <div className="bg-[#39BEAE] rounded-lg p-3 sm:p-6 ">
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-3xl font-bold mb-1 text-white`}>
            {value}
          </div>
          <div className="text-xs md:text-sm theme-text-secondary mt-2">{label}</div>
          {trend && (
            <div className={`text-xs mt-2 flex items-center gap-1 ${trend.isPositive ? 'text-gray-700' : 'text-red-900'}`}>
              {trend.isPositive ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              {trend.value}%
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-white/30 text-gray-100`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
