'use client'

/**
 * Button Component
 *
 * Reusable button component with consistent styling and variants.
 */

import { ReactNode, ButtonHTMLAttributes } from 'react'

// =============================================================================
// Types
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: ButtonVariant
  /** Button size */
  size?: ButtonSize
  /** Left icon */
  leftIcon?: ReactNode
  /** Right icon */
  rightIcon?: ReactNode
  /** Full width button */
  fullWidth?: boolean
  /** Loading state */
  isLoading?: boolean
  /** Rounded style */
  rounded?: boolean
}

// =============================================================================
// Style Classes
// =============================================================================

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-[#39BEAE] text-white hover:bg-[#2ea89a] shadow-lg shadow-[#39BEAE]/20',
  secondary: 'bg-black/20 text-white hover:bg-black/30 border border-gray-500/50',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20',
  success: 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20',
  ghost: 'bg-transparent text-white hover:bg-white/10',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'py-1.5 px-3 text-sm',
  md: 'py-2 px-4 text-base',
  lg: 'py-3 px-6 text-lg',
}

// =============================================================================
// Component
// =============================================================================

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = false,
  isLoading = false,
  rounded = true,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = `
    font-medium transition-all duration-200
    flex items-center justify-center gap-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${rounded ? 'rounded-full' : 'rounded-lg'}
    ${fullWidth ? 'w-full' : ''}
    ${VARIANT_CLASSES[variant]}
    ${SIZE_CLASSES[size]}
  `

  return (
    <button
      className={`${baseClasses} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <LoadingSpinner size={size} />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  )
}

// =============================================================================
// Loading Spinner Sub-component
// =============================================================================

interface LoadingSpinnerProps {
  size: ButtonSize
}

function LoadingSpinner({ size }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// =============================================================================
// Icon Button Variant
// =============================================================================

export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  /** Icon to display */
  icon: ReactNode
  /** Accessible label */
  'aria-label': string
}

export function IconButton({
  icon,
  size = 'md',
  className = '',
  ...props
}: IconButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  return (
    <Button
      size={size}
      className={`${sizeClasses[size]} !p-0 ${className}`}
      {...props}
    >
      {icon}
    </Button>
  )
}

export default Button
