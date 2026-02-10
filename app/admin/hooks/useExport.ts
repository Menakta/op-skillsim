/**
 * useExport Hook
 *
 * Reusable hook for exporting data to PDF across admin pages.
 * Provides export handlers for All, Filtered, and Selected data.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { exportToPDF, type ExportColumn } from '../utils'

// =============================================================================
// Types
// =============================================================================

export interface UseExportOptions<T> {
  /** All data items */
  data: T[]
  /** Filtered data items */
  filteredData: T[]
  /** Selected item keys */
  selectedKeys: Set<string>
  /** Function to get unique key from item */
  getItemKey: (item: T) => string
  /** Column configuration for PDF export */
  columns: ExportColumn<T>[]
  /** Filename prefix (e.g., 'registered-users', 'sessions') */
  filenamePrefix: string
  /** PDF title */
  title: string
  /** Optional subtitle generator */
  getSubtitle?: (type: 'all' | 'filtered' | 'selected', count: number, total: number) => string
}

export interface UseExportReturn {
  /** Whether the export menu is open */
  showExportMenu: boolean
  /** Toggle export menu visibility */
  setShowExportMenu: (show: boolean) => void
  /** Ref for the export menu container (for click outside handling) */
  exportMenuRef: React.RefObject<HTMLDivElement | null>
  /** Export all data */
  handleExportAll: () => Promise<void>
  /** Export filtered data */
  handleExportFiltered: () => Promise<void>
  /** Export selected data */
  handleExportSelected: () => Promise<void>
}

// =============================================================================
// Hook
// =============================================================================

export function useExport<T>({
  data,
  filteredData,
  selectedKeys,
  getItemKey,
  columns,
  filenamePrefix,
  title,
  getSubtitle,
}: UseExportOptions<T>): UseExportReturn {
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Close export menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Default subtitle generator
  const defaultGetSubtitle = (type: 'all' | 'filtered' | 'selected', count: number, total: number): string => {
    switch (type) {
      case 'all':
        return `All Records (${count} total)`
      case 'filtered':
        return `Filtered Records (${count} of ${total})`
      case 'selected':
        return `Selected Records (${count})`
      default:
        return ''
    }
  }

  const subtitleGenerator = getSubtitle || defaultGetSubtitle

  const handleExportAll = useCallback(async () => {
    const timestamp = new Date().toISOString().split('T')[0]
    await exportToPDF(data, columns, `${filenamePrefix}-all-${timestamp}.pdf`, {
      title,
      subtitle: subtitleGenerator('all', data.length, data.length),
    })
    setShowExportMenu(false)
  }, [data, columns, filenamePrefix, title, subtitleGenerator])

  const handleExportFiltered = useCallback(async () => {
    const timestamp = new Date().toISOString().split('T')[0]
    await exportToPDF(filteredData, columns, `${filenamePrefix}-filtered-${timestamp}.pdf`, {
      title,
      subtitle: subtitleGenerator('filtered', filteredData.length, data.length),
    })
    setShowExportMenu(false)
  }, [filteredData, data.length, columns, filenamePrefix, title, subtitleGenerator])

  const handleExportSelected = useCallback(async () => {
    const selectedData = data.filter(item => selectedKeys.has(getItemKey(item)))
    const timestamp = new Date().toISOString().split('T')[0]
    await exportToPDF(selectedData, columns, `${filenamePrefix}-selected-${timestamp}.pdf`, {
      title,
      subtitle: subtitleGenerator('selected', selectedData.length, data.length),
    })
    setShowExportMenu(false)
  }, [data, selectedKeys, getItemKey, columns, filenamePrefix, title, subtitleGenerator])

  return {
    showExportMenu,
    setShowExportMenu,
    exportMenuRef,
    handleExportAll,
    handleExportFiltered,
    handleExportSelected,
  }
}

// =============================================================================
// Dynamic Export Hook (for tabbed pages)
// =============================================================================

export interface UseExportDynamicReturn {
  /** Whether the export menu is open */
  showExportMenu: boolean
  /** Toggle export menu visibility */
  setShowExportMenu: (show: boolean) => void
  /** Ref for the export menu container (for click outside handling) */
  exportMenuRef: React.RefObject<HTMLDivElement | null>
  /** Export all data - requires getData callback */
  handleExportAll: () => Promise<void>
  /** Export filtered data - requires getData callback */
  handleExportFiltered: () => Promise<void>
  /** Export selected data - requires getData callback */
  handleExportSelected: () => Promise<void>
}

export interface ExportData<T> {
  /** All data items */
  all: T[]
  /** Filtered data items */
  filtered: T[]
  /** Selected item keys */
  selectedKeys: Set<string>
  /** Column configuration for PDF export */
  columns: ExportColumn<T>[]
  /** Name for the export (used in filename and title) */
  name: string
}

/**
 * Dynamic export hook for pages with tabs or dynamic data.
 * Instead of passing static data, you provide a callback that returns current data.
 *
 * Uses a ref to always get the latest getData function, avoiding stale closures
 * when the active tab changes.
 */
export function useExportDynamic<T>(
  getData: () => ExportData<T>,
  getItemKey: (item: T) => string = (item) => (item as { id: string }).id
): UseExportDynamicReturn {
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Use refs to always get the latest functions (avoids stale closure issues)
  const getDataRef = useRef(getData)
  const getItemKeyRef = useRef(getItemKey)

  // Keep refs updated with latest values
  useEffect(() => {
    getDataRef.current = getData
    getItemKeyRef.current = getItemKey
  }, [getData, getItemKey])

  // Close export menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExportAll = useCallback(async () => {
    const { all, columns, name } = getDataRef.current()
    const timestamp = new Date().toISOString().split('T')[0]
    await exportToPDF(all, columns, `${name.toLowerCase().replace(/\s+/g, '-')}-all-${timestamp}.pdf`, {
      title: `${name}`,
      subtitle: `All Records (${all.length} total)`,
    })
    setShowExportMenu(false)
  }, [])

  const handleExportFiltered = useCallback(async () => {
    const { all, filtered, columns, name } = getDataRef.current()
    const timestamp = new Date().toISOString().split('T')[0]
    await exportToPDF(filtered, columns, `${name.toLowerCase().replace(/\s+/g, '-')}-filtered-${timestamp}.pdf`, {
      title: `${name}`,
      subtitle: `Filtered Records (${filtered.length} of ${all.length})`,
    })
    setShowExportMenu(false)
  }, [])

  const handleExportSelected = useCallback(async () => {
    const { all, selectedKeys, columns, name } = getDataRef.current()
    const selectedData = all.filter(item => selectedKeys.has(getItemKeyRef.current(item)))
    const timestamp = new Date().toISOString().split('T')[0]
    await exportToPDF(selectedData, columns, `${name.toLowerCase().replace(/\s+/g, '-')}-selected-${timestamp}.pdf`, {
      title: `${name}`,
      subtitle: `Selected Records (${selectedData.length})`,
    })
    setShowExportMenu(false)
  }, [])

  return {
    showExportMenu,
    setShowExportMenu,
    exportMenuRef,
    handleExportAll,
    handleExportFiltered,
    handleExportSelected,
  }
}
