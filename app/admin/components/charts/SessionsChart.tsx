'use client'

/**
 * SessionsChart Component
 *
 * Bar chart showing user sessions by role.
 * Supports weekly, monthly, and yearly views.
 * Uses React Query for data fetching with 10-minute cache.
 * Export to PDF available for LTI users only.
 */

import { useState, useRef } from 'react'
import { Download } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { FilterButton } from '../ui/FilterButton'
import { useSessionsChart } from '../../hooks'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { exportChartToPDF } from '../../utils'

// =============================================================================
// Types
// =============================================================================

type TimeRange = 'weekly' | 'monthly' | 'yearly'

interface SessionsChartProps {
  className?: string
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
          {students > 0 && (
            <div
              className="w-full bg-[#14B8A6] transition-all duration-500"
              style={{ height: `${(studentPercent / heightPercent) * 100}%` }}
              title={`Students: ${students}`}
            />
          )}
          {teachers > 0 && (
            <div
              className="w-full bg-[#EC4899] transition-all duration-500"
              style={{ height: `${(teacherPercent / heightPercent) * 100}%` }}
              title={`Teachers: ${teachers}`}
            />
          )}
          {admins > 0 && (
            <div
              className="w-full bg-[#6366F1] transition-all duration-500"
              style={{ height: `${(adminPercent / heightPercent) * 100}%` }}
              title={`Admins: ${admins}`}
            />
          )}
        </div>
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
  const chartRef = useRef<HTMLDivElement>(null)
  const [range, setRange] = useState<TimeRange>('weekly')
  const [isExporting, setIsExporting] = useState(false)
  const { data = [], isLoading, error } = useSessionsChart(range)
  const { user } = useCurrentUser()

  const canExport = user?.isLti === true
  const hasData = data.length > 0

  const maxValue = Math.max(
    ...data.map((d) => d.students + d.teachers + d.admins),
    1
  )

  const totalStudents = data.reduce((sum, d) => sum + d.students, 0)
  const totalTeachers = data.reduce((sum, d) => sum + d.teachers, 0)
  const totalAdmins = data.reduce((sum, d) => sum + d.admins, 0)

  const handleExport = async () => {
    if (!chartRef.current) {
      console.error('Chart ref not available')
      return
    }

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().split('T')[0]
      const rangeLabel = range.charAt(0).toUpperCase() + range.slice(1)
      await exportChartToPDF(
        chartRef.current,
        `sessions-overview-${range}-${timestamp}.pdf`,
        {
          title: `Sessions Overview (${rangeLabel})`,
          subtitle: `Students: ${totalStudents} | Teachers: ${totalTeachers} | Admins: ${totalAdmins}`,
        }
      )
    } catch (err) {
      console.error('Failed to export chart:', err)
      alert('Failed to export chart. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle>Sessions Overview</CardTitle>
            {canExport && hasData && (
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="p-2 rounded-lg theme-bg-secondary hover:theme-bg-tertiary transition-colors disabled:opacity-50"
                title="Export to PDF"
              >
                <Download className={`w-4 h-4 theme-text-muted ${isExporting ? 'animate-pulse' : ''}`} />
              </button>
            )}
          </div>
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
        <div ref={chartRef}>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#14B8A6]" />
              <span className="text-xs theme-text-muted">Students</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#EC4899]" />
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
                <p className="text-sm text-red-400">{error.message}</p>
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
          {hasData && !isLoading && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t theme-border">
              <div className="text-center">
                <p className="text-lg font-bold text-[#14B8A6]">
                  {totalStudents}
                </p>
                <p className="text-xs theme-text-muted">Total Students</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[#EC4899]">
                  {totalTeachers}
                </p>
                <p className="text-xs theme-text-muted">Total Teachers</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[#6366F1]">
                  {totalAdmins}
                </p>
                <p className="text-xs theme-text-muted">Total Admins</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
