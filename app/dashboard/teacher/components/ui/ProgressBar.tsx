'use client'

/**
 * ProgressBar Component
 *
 * Visual progress indicator with customizable colors.
 */

interface ProgressBarProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'success' | 'warning' | 'danger' | 'teal'
  showLabel?: boolean
  className?: string
}

const SIZE_CLASSES = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
}

const COLOR_CLASSES = {
  default: 'bg-gray-400',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  teal: 'bg-[#39BEAE]',
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'teal',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  // Determine color based on percentage if using default
  const effectiveColor = color === 'default'
    ? percentage >= 80 ? 'success' : percentage >= 50 ? 'warning' : 'danger'
    : color

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Progress</span>
          <span className="text-white">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${SIZE_CLASSES[size]}`}>
        <div
          className={`${SIZE_CLASSES[size]} rounded-full transition-all duration-500 ${COLOR_CLASSES[effectiveColor]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
