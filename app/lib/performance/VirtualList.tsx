'use client'

/**
 * VirtualList Component
 *
 * Virtualized list for rendering large datasets efficiently.
 * Only renders items that are visible in the viewport.
 */

import React, { useRef, useState, useCallback, useMemo } from 'react'

// =============================================================================
// Types
// =============================================================================

export interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[]
  /** Height of each item in pixels */
  itemHeight: number
  /** Height of the container in pixels */
  containerHeight: number
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode
  /** Additional items to render above/below viewport */
  overscan?: number
  /** Optional className for the container */
  className?: string
  /** Key extractor function */
  keyExtractor?: (item: T, index: number) => string | number
}

// =============================================================================
// Component
// =============================================================================

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = '',
  keyExtractor,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  // Calculate visible range
  const { startIndex, visibleItems } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount)

    const visibleItems = items.slice(startIndex, endIndex + 1).map((item, i) => ({
      item,
      index: startIndex + i,
    }))

    return { startIndex, endIndex, visibleItems }
  }, [items, itemHeight, containerHeight, scrollTop, overscan])

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // Total height for scroll area
  const totalHeight = items.length * itemHeight

  // Offset for visible items
  const offsetY = startIndex * itemHeight

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Spacer to maintain scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={keyExtractor ? keyExtractor(item, index) : index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default VirtualList
