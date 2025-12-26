'use client'

/**
 * LoadingState Component
 *
 * Stylish loading indicator for admin pages.
 * Uses brand teal color with smooth animations.
 */

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingState({ message = 'Loading...', size = 'md' }: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const dotSize = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Pulsing dots loader */}
      <div className={`relative ${sizeClasses[size]} mb-6`}>
        <div className="absolute inset-0 flex items-center justify-center gap-1.5">
          <span
            className={`${dotSize[size]} rounded-full bg-[#39BEAE] animate-pulse`}
            style={{ animationDelay: '0ms', animationDuration: '600ms' }}
          />
          <span
            className={`${dotSize[size]} rounded-full bg-[#39BEAE] animate-pulse`}
            style={{ animationDelay: '150ms', animationDuration: '600ms' }}
          />
          <span
            className={`${dotSize[size]} rounded-full bg-[#39BEAE] animate-pulse`}
            style={{ animationDelay: '300ms', animationDuration: '600ms' }}
          />
        </div>
      </div>

      {message && (
        <p className="text-sm theme-text-muted tracking-wide">{message}</p>
      )}
    </div>
  )
}

/**
 * Inline spinner for buttons and small areas
 */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin w-5 h-5 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-20"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
