'use client'

/**
 * SessionStatusChart Component
 *
 * Doughnut chart showing completed vs active training sessions.
 * Uses React Query for data fetching with 10-minute cache.
 * Export to PDF available for LTI users only.
 */

import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { useTrainingAnalytics } from '../../hooks'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { exportChartToPDF } from '../../utils'

// =============================================================================
// Types
// =============================================================================

interface SessionStatusChartProps {
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

const COLORS = {
  completed: '#22C55E',
  active: '#3B82F6',
}

// =============================================================================
// Custom Tooltip
// =============================================================================

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload: {
      status?: string
      count: number
    }
  }>
}

function DoughnutTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0]
  const status = data.payload.status || data.name
  const count = data.value

  return (
    <div className="theme-bg-elevated theme-text-primary text-sm px-3 py-2 rounded-lg shadow-lg theme-border border">
      <p className="font-medium capitalize">{status}</p>
      <p className="theme-text-secondary">{count} sessions</p>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function SessionStatusChart({ className = '' }: SessionStatusChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const { data, isLoading, error } = useTrainingAnalytics()
  const { user } = useCurrentUser()

  const canExport = user?.isLti === true

  const handleExport = async () => {
    if (!chartRef.current || !data) return

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().split('T')[0]
      await exportChartToPDF(
        chartRef.current,
        `session-status-chart-${timestamp}.pdf`,
        {
          title: 'Training Session Status Distribution',
          subtitle: `Total: ${data.totals.total} | Completed: ${data.totals.completed} | Active: ${data.totals.active}`,
        }
      )
    } catch (err) {
      console.error('Failed to export chart:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const doughnutData = data?.statusCounts.map((item) => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    status: item.status,
  })) || []

  const hasData = data && data.totals.total > 0

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Training Session Status Distribution</CardTitle>
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
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm theme-text-muted">No training session data available</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={doughnutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {doughnutData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.status === 'completed' ? COLORS.completed : COLORS.active}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<DoughnutTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-sm theme-text-primary">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {hasData && !isLoading && data && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t theme-border">
              <div className="text-center">
                <p className="text-2xl font-bold theme-text-primary">{data.totals.total}</p>
                <p className="text-xs theme-text-muted">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold theme-text-success">{data.totals.completed}</p>
                <p className="text-xs theme-text-muted">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold theme-text-info">{data.totals.active}</p>
                <p className="text-xs theme-text-muted">Active</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
