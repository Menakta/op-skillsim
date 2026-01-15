'use client'

/**
 * ScoreDistributionChart Component
 *
 * Bar chart showing student score distribution across percentage ranges.
 * Uses React Query for data fetching.
 * Export to PDF available for LTI users only.
 */

import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { useResults } from '../../hooks'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { exportChartToPDF } from '../../utils'

// =============================================================================
// Types
// =============================================================================

interface ScoreDistributionChartProps {
  className?: string
}

interface ScoreRange {
  range: string
  count: number
  fill: string
}

// =============================================================================
// Constants
// =============================================================================

const SCORE_RANGES = [
  { min: 1, max: 20, label: '1-20%', fill: '#EF4444' },
  { min: 21, max: 40, label: '21-40%', fill: '#F97316' },
  { min: 41, max: 60, label: '41-60%', fill: '#F59E0B' },
  { min: 61, max: 80, label: '61-80%', fill: '#22C55E' },
  { min: 81, max: 100, label: '81-100%', fill: '#10B981' },
]

// =============================================================================
// Custom Tooltip
// =============================================================================

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload: ScoreRange
  }>
}

function BarTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0]

  return (
    <div className="theme-bg-elevated theme-text-primary text-sm px-3 py-2 rounded-lg shadow-lg theme-border border">
      <p className="font-medium">{data.payload.range}</p>
      <p className="theme-text-secondary">{data.value} students</p>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function ScoreDistributionChart({ className = '' }: ScoreDistributionChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const { data, isLoading, error } = useResults()
  const { user } = useCurrentUser()

  const canExport = user?.isLti === true

  // Calculate score distribution
  const chartData: ScoreRange[] = SCORE_RANGES.map(range => {
    const count = data?.results.filter(
      result => result.scorePercentage >= range.min && result.scorePercentage <= range.max
    ).length || 0

    return {
      range: range.label,
      count,
      fill: range.fill,
    }
  })

  const totalStudents = data?.results.length || 0
  const hasData = totalStudents > 0

  const handleExport = async () => {
    if (!chartRef.current || !data) return

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().split('T')[0]
      await exportChartToPDF(
        chartRef.current,
        `score-distribution-chart-${timestamp}.pdf`,
        {
          title: 'Student Score Distribution',
          subtitle: `Total Results: ${totalStudents}`,
        }
      )
    } catch (err) {
      console.error('Failed to export chart:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Score Distribution</CardTitle>
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
      </CardHeader>
      <CardContent>
        <div ref={chartRef}>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm theme-text-muted">Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm theme-text-error">{error.message}</p>
            </div>
          ) : !hasData ? (
            <div className="h-64 flex items-center justify-center flex-col gap-2">
              <p className="text-sm theme-text-muted">No quiz results available</p>
              <p className="text-xs theme-text-tertiary">
                Score distribution will appear here once students complete quizzes
              </p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <XAxis
                    dataKey="range"
                    tick={{ fill: 'var(--color-text-primary)', fontSize: 12 }}
                    tickLine={{ stroke: 'var(--color-border)' }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--color-text-primary)', fontSize: 12 }}
                    tickLine={{ stroke: 'transparent' }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {hasData && !isLoading && (
            <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t theme-border">
              {chartData.map((item) => (
                <div key={item.range} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-xs theme-text-muted">
                    {item.range}: {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
