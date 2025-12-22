'use client'

/**
 * StatCard Component
 *
 * Displays a single statistic with icon and label.
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
  default: 'text-white',
  green: 'text-green-400',
  blue: 'text-blue-400',
  yellow: 'text-yellow-400',
  purple: 'text-purple-400',
  red: 'text-red-400',
}

const ICON_BG_CLASSES = {
  default: 'bg-gray-600',
  green: 'bg-green-600/20',
  blue: 'bg-blue-600/20',
  yellow: 'bg-yellow-600/20',
  purple: 'bg-purple-600/20',
  red: 'bg-red-600/20',
}

export function StatCard({ label, value, icon, trend, color = 'default' }: StatCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-3xl font-bold mb-1 ${COLOR_CLASSES[color]}`}>
            {value}
          </div>
          <div className="text-gray-400 text-sm">{label}</div>
          {trend && (
            <div className={`text-xs mt-2 flex items-center gap-1 ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
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
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${ICON_BG_CLASSES[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
