'use client'

/**
 * FittingCard Component
 *
 * Displays a single fitting option with its details.
 */

import { Card, CardContent, Badge } from '../../components'

// =============================================================================
// Types
// =============================================================================

interface FittingOption {
  id: number
  fitting_id: string
  name: string
  description: string | null
  is_correct: boolean
  nzs3500_reference?: string | null
  created_at: string
}

interface FittingCardProps {
  fitting: FittingOption
}

// =============================================================================
// Component
// =============================================================================

export function FittingCard({ fitting }: FittingCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="info">{fitting.fitting_id}</Badge>
            <Badge variant={fitting.is_correct ? 'success' : 'warning'}>
              {fitting.is_correct ? 'Correct' : 'Distractor'}
            </Badge>
          </div>

          {/* Name */}
          <h3 className="font-medium theme-text-primary mb-1">
            {fitting.name}
          </h3>

          {/* Description */}
          {fitting.description && (
            <p className="text-sm theme-text-muted mb-2">
              {fitting.description}
            </p>
          )}

          {/* Reference */}
          {fitting.nzs3500_reference && (
            <p className="text-xs theme-text-tertiary">
              <span className="font-medium">Ref:</span> {fitting.nzs3500_reference}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
