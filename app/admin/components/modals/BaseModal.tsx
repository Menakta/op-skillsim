/**
 * Base Modal Component
 *
 * Reusable modal wrapper with consistent styling.
 */

interface BaseModalProps {
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  footer?: React.ReactNode
}

const maxWidthClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
}

export function BaseModal({
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '2xl',
  footer,
}: BaseModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className={`theme-bg-secondary rounded-t-xl sm:rounded-xl w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-700">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold theme-text-primary">{title}</h2>
              {subtitle && (
                <p className="theme-text-muted text-sm mt-1 truncate">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 theme-text-muted hover:theme-text-primary hover:theme-bg-hover cursor-pointer rounded-lg transition-colors text-2xl leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[65vh]">
          {children}
        </div>

        {/* Footer */}
        {footer !== undefined ? (
          footer
        ) : (
          <div className="p-4 sm:p-6 border-t border-gray-700">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#39BEAE] hover:bg-[#2ea89a] cursor-pointer text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
