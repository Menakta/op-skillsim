'use client'

/**
 * SessionsChart Component
 *
 * Lazy-loaded bar chart showing user sessions by role.
 * Supports weekly, monthly, and yearly views.
 * Only fetches data when the component is visible.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './Card'
import { FilterButton } from './FilterButton'

// =============================================================================
// Types
// =============================================================================

type TimeRange = 'weekly' | 'monthly' | 'yearly'

interface ChartDataPoint {
  label: string
  students: number
  teachers: number
  admins: number
}

interface SessionsChartProps {
  className?: string
}

// =============================================================================
// Custom Hook for Intersection Observer
// =============================================================================

function useIntersectionObserver(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const ref = useRef<HTMLDivElement>(null)
  const hasTriggered = useRef(false)

  useEffect(() => {
    const element = ref.current
    if (!element || hasTriggered.current) return

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (entry.isIntersecting && !hasTriggered.current) {
        hasTriggered.current = true
        callback()
        observer.disconnect()
      }
    }, options)

    observer.observe(element)

    return () => observer.disconnect()
  }, [callback, options])

  return ref
}

// =============================================================================
// Chart Bar Component
// =============================================================================

interface ChartBarProps {
  label: string
  students: number
  teachers: number
  admins: number
  maxValue: number
}

function ChartBar({ label, students, teachers, admins, maxValue }: ChartBarProps) {
  const total = students + teachers + admins
  const heightPercent = maxValue > 0 ? (total / maxValue) * 100 : 0

  // Calculate proportions for stacked bar
  const studentPercent = total > 0 ? (students / total) * heightPercent : 0
  const teacherPercent = total > 0 ? (teachers / total) * heightPercent : 0
  const adminPercent = total > 0 ? (admins / total) * heightPercent : 0

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <div className="relative w-full h-40 flex items-end justify-center">
        <div
          className="w-8 sm:w-10 flex flex-col-reverse rounded-t-sm overflow-hidden transition-all duration-500 ease-out"
          style={{ height: `${heightPercent}%`, minHeight: total > 0 ? '4px' : '0' }}
        >
          {/* Students - Purple */}
          {students > 0 && (
            <div
              className="w-full bg-[#14B8A6] transition-all duration-500"
              style={{ height: `${(studentPercent / heightPercent) * 100}%` }}
              title={`Students: ${students}`}
            />
          )}
          {/* Teachers - Green */}
          {teachers > 0 && (
            <div
              className="w-full bg-[#EC4899] transition-all duration-500"
              style={{ height: `${(teacherPercent / heightPercent) * 100}%` }}
              title={`Teachers: ${teachers}`}
            />
          )}
          {/* Admins - Yellow */}
          {admins > 0 && (
            <div
              className="w-full bg-[#6366F1] transition-all duration-500"
              style={{ height: `${(adminPercent / heightPercent) * 100}%` }}
              title={`Admins: ${admins}`}
            />
          )}
        </div>
        {/* Tooltip on hover */}
        {total > 0 && (
          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
            S: {students} | T: {teachers} | A: {admins}
          </div>
        )}
      </div>
      <span className="text-xs theme-text-muted truncate w-full text-center">{label}</span>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function SessionsChart({ className = '' }: SessionsChartProps) {
  const [range, setRange] = useState<TimeRange>('weekly')
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const fetchChartData = useCallback(async (timeRange: TimeRange) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/sessions-chart?range=${timeRange}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch chart data')
      }

      setData(result.data)
      setHasLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Lazy load on intersection
  const containerRef = useIntersectionObserver(
    () => fetchChartData(range),
    { threshold: 0.1 }
  )

  // Fetch when range changes (only if already loaded once)
  useEffect(() => {
    if (hasLoaded) {
      fetchChartData(range)
    }
  }, [range, hasLoaded, fetchChartData])

  // Calculate max value for scaling
  const maxValue = Math.max(
    ...data.map((d) => d.students + d.teachers + d.admins),
    1
  )

  return (
    <div ref={containerRef}>
      <Card className={className}>
        <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Sessions Overview</CardTitle>
          <div className="flex gap-1 theme-bg-secondary rounded-lg p-1">
            <FilterButton
              active={range === 'weekly'}
              onClick={() => setRange('weekly')}
            >
              Weekly
            </FilterButton>
            <FilterButton
              active={range === 'monthly'}
              onClick={() => setRange('monthly')}
            >
              Monthly
            </FilterButton>
            <FilterButton
              active={range === 'yearly'}
              onClick={() => setRange('yearly')}
            >
              Yearly
            </FilterButton>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#14B8A6]" />
            <span className="text-xs theme-text-muted">Students</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span className="text-xs theme-text-muted">Teachers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#6366F1]" />
            <span className="text-xs theme-text-muted">Admins</span>
          </div>
        </div>

        {/* Chart Area */}
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg z-10">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#39BEAE] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm theme-text-muted">Loading...</span>
              </div>
            </div>
          )}

          {error ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : data.length === 0 && !isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm theme-text-muted">No data available</p>
            </div>
          ) : (
            <div className="flex items-end gap-1 sm:gap-2 h-48 border-b theme-border pt-4">
              {data.map((point, index) => (
                <div key={index} className="group flex-1 min-w-0">
                  <ChartBar
                    label={point.label}
                    students={point.students}
                    teachers={point.teachers}
                    admins={point.admins}
                    maxValue={maxValue}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {data.length > 0 && !isLoading && (
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t theme-border">
            <div className="text-center">
              <p className="text-lg font-bold text-[#df5e5e]">
                {data.reduce((sum, d) => sum + d.students, 0)}
              </p>
              <p className="text-xs theme-text-muted">Total Students</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-400">
                {data.reduce((sum, d) => sum + d.teachers, 0)}
              </p>
              <p className="text-xs theme-text-muted">Total Teachers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#6366F1]">
                {data.reduce((sum, d) => sum + d.admins, 0)}
              </p>
              <p className="text-xs theme-text-muted">Total Admins</p>
            </div>
          </div>
        )}
      </CardContent>
      </Card>
    </div>
  )
}
