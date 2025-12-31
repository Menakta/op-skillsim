/**
 * FilterButton Component
 *
 * Reusable filter button for toggle filters.
 */

interface FilterButtonProps {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}

export function FilterButton({ children, active, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer
        ${active
          ? 'bg-[#39BEAE] text-white'
          : 'theme-bg-tertiary theme-text-primary hover:theme-bg-hover'
        }
      `}
    >
      {children}
    </button>
  )
}
