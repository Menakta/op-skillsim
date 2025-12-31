/**
 * TabButton Component
 *
 * Reusable tab button with icon and count badge.
 */

interface TabButtonProps {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  count: number
}

export function TabButton({ children, active, onClick, icon, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
        ${active
          ? 'bg-[#39BEAE] text-white'
          : 'theme-bg-secondary theme-text-primary hover:theme-bg-hover'
        }
      `}
    >
      {icon}
      {children}
      <span className={`px-2 py-0.5 rounded-full text-xs ${active ? 'bg-white/20' : 'theme-bg-tertiary'}`}>
        {count}
      </span>
    </button>
  )
}
