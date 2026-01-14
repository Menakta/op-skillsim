'use client'

/**
 * TrainingAnalytics Component
 *
 * Displays training session analytics using Recharts:
 * - Doughnut chart: Completed vs Active sessions
 * - Horizontal Bar chart: Active sessions by training phase
 */

import { useState, useEffect, useCallback } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from './Card'

// =============================================================================
// Types
// =============================================================================

interface StatusCount {
  status: string
  count: number
}

interface PhaseCount {
  current_training_phase: string
  phaseName: string
  count: number
}

interface TrainingAnalyticsData {
  statusCounts: StatusCount[]
  phaseCounts: PhaseCount[]
  totals: {
    completed: number
    active: number
    total: number
  }
}

interface TrainingAnalyticsProps {
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

// Colors matching the theme
const COLORS = {
  completed: '#22C55E', // Green for completed
  active: '#3B82F6',    // Blue for active
}

const PHASE_COLORS = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#EF4444', // Red
  '#14B8A6', // Teal
]

// =============================================================================
// Custom Tooltip Components
// =============================================================================

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload: {
      status?: string
      phaseName?: string
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
    <div className="bg-gray-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg border border-gray-700">
      <p className="font-medium capitalize">{status}</p>
      <p className="text-gray-300">{count} sessions</p>
    </div>
  )
}

function BarTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0]
  const phaseName = data.payload.phaseName || data.name
  const count = data.value

  return (
    <div className="bg-gray-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg border border-gray-700">
      <p className="font-medium">{phaseName}</p>
      <p className="text-gray-300">{count} active sessions</p>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function TrainingAnalytics({ className = '' }: TrainingAnalyticsProps) {
  const [data, setData] = useState<TrainingAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/training-analytics')
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics')
      }

      setData(result.data)
      console.log('Training analytics data:', result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Prepare doughnut chart data
  const doughnutData = data?.statusCounts.map((item) => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    status: item.status,
  })) || []

  // Prepare bar chart data (filter phases with 0 count for cleaner display)
  const barData = data?.phaseCounts.map((item, index) => ({
    phase: item.current_training_phase,
    phaseName: item.phaseName,
    count: item.count,
    fill: PHASE_COLORS[index % PHASE_COLORS.length],
  })) || []

  // Check if there's any data to display
  const hasData = data && data.totals.total > 0
  const hasActiveData = data && data.totals.active > 0

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {/* Doughnut Chart - Session Status */}
      <Card>
        <CardHeader>
          <CardTitle>Session Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#39BEAE] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm theme-text-muted">Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : !hasData ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm theme-text-muted">No session data available</p>
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

          {/* Summary Stats */}
          {hasData && !isLoading && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t theme-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{data.totals.completed}</p>
                <p className="text-xs theme-text-muted">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{data.totals.active}</p>
                <p className="text-xs theme-text-muted">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold theme-text-primary">{data.totals.total}</p>
                <p className="text-xs theme-text-muted">Total</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horizontal Bar Chart - Active Sessions by Phase */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions by Phase</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#39BEAE] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm theme-text-muted">Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : !hasActiveData ? (
            <div className="h-64 flex items-center justify-center flex-col gap-2">
              <p className="text-sm theme-text-muted">No active sessions</p>
              <p className="text-xs theme-text-tertiary">
                Active session distribution will appear here
              </p>
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 1, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fill: 'currentColor', fontSize: 12, color: 'blue' }}
                    tickLine={{ stroke: 'currentColor' }}
                    axisLine={{ stroke: 'currentColor' }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="phaseName"
                    tick={{ fill: 'currentColor', fontSize: 11 }}
                    tickLine={{ stroke: 'transparent' }}
                    axisLine={{ stroke: 'transparent' }}
                    width={95}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={30}
                  >
                    {barData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Phase Legend */}
          {hasActiveData && !isLoading && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t theme-border">
              {barData.filter(p => p.count > 0).map((phase, index) => (
                <div key={phase.phase} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: PHASE_COLORS[index % PHASE_COLORS.length] }}
                  />
                  <span className="text-xs theme-text-muted">
                    {phase.phase}: {phase.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
