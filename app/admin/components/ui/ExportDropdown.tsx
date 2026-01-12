/**
 * ExportDropdown Component
 *
 * Reusable dropdown menu for exporting data to PDF.
 * Provides options to export All, Filtered, or Selected data.
 */

import { Download, ChevronDown } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface ExportDropdownProps {
  /** Whether the dropdown menu is open */
  isOpen: boolean
  /** Toggle dropdown visibility */
  onToggle: () => void
  /** Ref for click outside handling */
  menuRef: React.RefObject<HTMLDivElement | null>
  /** Export all handler */
  onExportAll: () => void
  /** Export filtered handler */
  onExportFiltered: () => void
  /** Export selected handler */
  onExportSelected: () => void
  /** Total count of all items */
  allCount: number
  /** Count of filtered items */
  filteredCount: number
  /** Count of selected items */
  selectedCount: number
}

// =============================================================================
// Component
// =============================================================================

export function ExportDropdown({
  isOpen,
  onToggle,
  menuRef,
  onExportAll,
  onExportFiltered,
  onExportSelected,
  allCount,
  filteredCount,
  selectedCount,
}: ExportDropdownProps) {
  return (
    <div className="relative ml-auto" ref={menuRef}>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 bg-[#39BEAE] hover:bg-[#2ea89a] text-white rounded-lg transition-colors"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <button
            onClick={onExportAll}
            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#39BEAE]/20 flex items-center justify-between"
          >
            <span>Export All</span>
            <span className="text-gray-400 text-xs">{allCount} rows</span>
          </button>
          <button
            onClick={onExportFiltered}
            disabled={filteredCount === 0}
            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#39BEAE]/20 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-700"
          >
            <span>Export Filtered</span>
            <span className="text-gray-400 text-xs">{filteredCount} rows</span>
          </button>
          <button
            onClick={onExportSelected}
            disabled={selectedCount === 0}
            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#39BEAE]/20 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-700"
          >
            <span>Export Selected</span>
            <span className="text-gray-400 text-xs">{selectedCount} rows</span>
          </button>
        </div>
      )}
    </div>
  )
}
