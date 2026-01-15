'use client'

/**
 * PhaseDistributionChart Component
 *
 * Horizontal bar chart showing active training sessions by phase.
 * Uses React Query for data fetching with 10-minute cache.
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
import { useTrainingAnalytics } from '../../hooks'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { exportChartToPDF } from '../../utils'

// =============================================================================
// Types
// =============================================================================

interface PhaseDistributionChartProps {
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

const PHASE_COLORS = [
  '#f65c64',
  '#EC4899',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#6366F1',
  '#EF4444',
  '#14B8A6',
]

// =============================================================================
// Custom Tooltip
// =============================================================================

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload: {
      phaseName?: string
      count: number
    }
  }>
}

function BarTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0]
  const phaseName = data.payload.phaseName || data.name
  const count = data.value

  return (
    <div className="theme-bg-elevated theme-text-primary text-sm px-3 py-2 rounded-lg shadow-lg theme-border border">
      <p className="font-medium">{phaseName}</p>
      <p className="theme-text-secondary">{count} active sessions</p>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function PhaseDistributionChart({ className = '' }: PhaseDistributionChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const { data, isLoading, error } = useTrainingAnalytics()
  const { user } = useCurrentUser()

  const canExport = user?.isLti === true

  const barData = data?.phaseCounts.map((item, index) => ({
    phaseKey: item.phaseKey,
    phaseName: item.phaseName,
    count: item.count,
    fill: PHASE_COLORS[index % PHASE_COLORS.length],
  })) || []

  const hasActiveData = data && data.totals.active > 0

  const handleExport = async () => {
    if (!chartRef.current || !data) return

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().split('T')[0]
      await exportChartToPDF(
        chartRef.current,
        `phase-distribution-chart-${timestamp}.pdf`,
        {
          title: 'Active Training Sessions by Phase',
          subtitle: `Total Active Sessions: ${data.totals.active}`,
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
          <CardTitle>Active Training Sessions by Phase</CardTitle>
          {canExport && hasActiveData && (
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
          ) : !hasActiveData ? (
            <div className="h-64 flex items-center justify-center flex-col gap-2">
              <p className="text-sm theme-text-muted">No active training sessions</p>
              <p className="text-xs theme-text-tertiary">
                Active training sessions distribution will appear here
              </p>
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 1, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fill: 'var(--color-text-primary)', fontSize: 12 }}
                    tickLine={{ stroke: 'var(--color-border)' }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="phaseName"
                    tick={{ fill: 'var(--color-text-primary)', fontSize: 10 }}
                    tickLine={{ stroke: 'transparent' }}
                    axisLine={{ stroke: 'transparent' }}
                    width={57}
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

          {hasActiveData && !isLoading && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t theme-border">
              {barData.filter(p => p.count > 0).map((phase) => (
                <div key={phase.phaseKey} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: phase.fill }}
                  />
                  <span className="text-xs theme-text-muted">
                    {phase.phaseName}: {phase.count}
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
