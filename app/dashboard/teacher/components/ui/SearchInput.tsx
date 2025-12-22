'use client'

/**
 * SearchInput Component
 *
 * Search input with icon for filtering data.
 */

import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-10 pr-4 py-2
          bg-gray-700 border border-gray-600 rounded-lg
          text-white placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-[#39BEAE] focus:border-transparent
          transition-all
        "
      />
    </div>
  )
}
