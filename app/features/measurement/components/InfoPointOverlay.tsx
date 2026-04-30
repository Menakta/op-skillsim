'use client'

/**
 * InfoPointOverlay Component
 *
 * Displays measurement guidance on the stream:
 * - Info point markers: clickable icons that open explanation bubbles
 * - Animated measurement line: draws A->B, fades out, repeats 3 times
 *   with a "measure here" label
 */

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { useTheme } from '@/app/context/ThemeContext'
import { Shovel, Wrench, Ruler, Package, Droplets,ScanSearch } from 'lucide-react'
import type { InfoPointData, MeasurementGuidanceData } from '@/app/lib/messageTypes'

// =============================================================================
// Info Point Content Registry
// Maps point ID prefixes to their display content (icon, title, description).
// Measurement points (*_start / *_end) are handled separately.
// =============================================================================

interface InfoPointContent {
  icon: ReactNode
  title: string
  description: string
  color: string
}

function getInfoPointContent(pointId: string): InfoPointContent {
  const id = pointId.toLowerCase()

  if (id.includes('excavation')) {
    return {
      icon: <Shovel className="w-4 h-4" />,
      title: 'Excavation Point',
      description: 'Click on the marked area to start digging.',
      color: '#39BEAE',
    }
  }

  if (id.includes('accesscap')) {
    return {
      icon: <Wrench className="w-4 h-4" />,
      title: 'Access Cap',
      description: 'Open the access cap and fit the air plug securely to prepare for the pressure test.',
      color: '#39BEAE',
    }
  }

  if (id.includes('pipeconnection')) {
    return {
      icon: <Package className="w-4 h-4" />,
      title: 'Pipe Connection',
      description: 'Select a fitting from the inventory, then position it over the open section. A ghost preview will appear when aligned correctly. Click to attach.',
      color: '#79CFC2',
    }
  }

  if (id.includes('glue')) {
    return {
      icon: <Droplets className="w-4 h-4" />,
      title: 'Glue Application',
      description: 'Click on each blinking joint to apply adhesive. The glue will seal automatically once applied to all marked spots.',
      color: '#39BEAE',
    }
  }

  // Default fallback for unknown interaction points
  return {
    icon: <ScanSearch className="w-4 h-4" />,
    title: 'Interaction Point',
    description: 'X-Ray pipe to measure internal dimensions and check for structural issues. Use X-Ray controls from the sidebar to toggle visibility.',
    color: '#39BEAE',
  }
}

// =============================================================================
// Types
// =============================================================================

interface InfoPoint extends InfoPointData {
  timestamp: number
}

interface MeasurementLine extends MeasurementGuidanceData {
  timestamp: number
}

export interface InfoPointOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  className?: string
}

export interface InfoPointOverlayRef {
  handleInfoPoint: (data: InfoPointData) => void
  handleMeasurementGuidance: (data: MeasurementGuidanceData) => void
  clearAll: () => void
}

// =============================================================================
// Hook: useInfoPoints
// =============================================================================

export function useInfoPoints() {
  const [infoPoints, setInfoPoints] = useState<Map<string, InfoPoint>>(new Map())
  const [measurementLine, setMeasurementLine] = useState<MeasurementLine | null>(null)

  const handleInfoPoint = useCallback((data: InfoPointData) => {
    setInfoPoints(prev => {
      const next = new Map(prev)

      if (!data.visible) {
        next.delete(data.id)
      } else {
        next.set(data.id, {
          ...data,
          timestamp: Date.now()
        })
      }

      return next
    })
  }, [])

  const handleMeasurementGuidance = useCallback((data: MeasurementGuidanceData) => {
    if (!data.visible) {
      setMeasurementLine(null)
    } else {
      setMeasurementLine({
        ...data,
        timestamp: Date.now()
      })
    }
  }, [])

  const clearAll = useCallback(() => {
    setInfoPoints(new Map())
    setMeasurementLine(null)
  }, [])

  return {
    infoPoints,
    measurementLine,
    handleInfoPoint,
    handleMeasurementGuidance,
    clearAll
  }
}

// =============================================================================
// Component: InfoPointMarker (clickable info bubble)
// =============================================================================

interface InfoPointMarkerProps {
  point: InfoPoint
  containerWidth: number
  containerHeight: number
}

function InfoPointMarker({ point, containerWidth, containerHeight }: InfoPointMarkerProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const x = point.x * containerWidth
  const y = point.y * containerHeight

  const isMeasurementPoint = point.id.endsWith('_start') || point.id.endsWith('_end')
  const isStart = point.id.endsWith('_start')

  const interactionContent = !isMeasurementPoint ? getInfoPointContent(point.id) : null
  const color = isMeasurementPoint ? '#39BEAE' : interactionContent!.color
  const baseSize = 20
  const size = baseSize * (point.scale || 1)

  // Use CSS :hover via the group class — no JS events needed, no click blocking
  return (
    <div
      className="absolute group/marker"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      {/* Invisible hover target — pointer-events: auto but passes clicks through */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 3,
          height: size * 3,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'auto',
          cursor: 'default',
        }}
      />

      {/* Soft pulsing glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 2.2,
          height: size * 2.2,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: color,
          opacity: 0.15,
          animation: 'infoGlow 2s ease-in-out infinite',
        }}
      />

      {/* Marker circle */}
      <div
        className="relative flex items-center justify-center rounded-full transition-transform duration-200 group-hover/marker:scale-110"
        style={{
          width: size * 1.4,
          height: size * 1.4,
          backgroundColor: color,
          boxShadow: `0 0 ${size * 0.6}px ${color}, 0 2px 8px rgba(0,0,0,0.3)`,
          border: '2px solid rgba(255,255,255,0.8)',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {isMeasurementPoint ? (
          <span className="text-white font-bold select-none" style={{ fontSize: size * 0.55, lineHeight: 1 }}>
            {isStart ? 'A' : 'B'}
          </span>
        ) : (
          <span className="text-white flex items-center justify-center" style={{ width: size * 0.6, height: size * 0.6 }}>
            {interactionContent!.icon}
          </span>
        )}
      </div>

      {/* Info bubble — shown on hover via CSS group */}
      <div
        className="absolute whitespace-normal rounded-xl text-sm shadow-2xl opacity-0 scale-95 group-hover/marker:opacity-100 group-hover/marker:scale-100 transition-all duration-200"
        style={{
          left: '50%',
          top: -(size * 1.2 + 12),
          transform: 'translateX(-50%) translateY(-100%)',
          width: 230,
          backgroundColor: isDark ? 'rgba(13, 29, 64, 0.95)' : 'rgba(255, 255, 255, 0.97)',
          color: isDark ? '#e2e8f0' : '#1e293b',
          border: `1.5px solid ${color}`,
          backdropFilter: 'blur(12px)',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        {/* Arrow pointing down */}
        <div
          className="absolute"
          style={{
            left: '50%',
            bottom: -6,
            transform: 'translateX(-50%) rotate(45deg)',
            width: 12,
            height: 12,
            backgroundColor: isDark ? 'rgba(13, 29, 64, 0.95)' : 'rgba(255, 255, 255, 0.97)',
            borderRight: `1.5px solid ${color}`,
            borderBottom: `1.5px solid ${color}`,
          }}
        />

        {isMeasurementPoint ? (
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Ruler className="w-3.5 h-3.5" style={{ color }} />
              <span className="font-semibold" style={{ color }}>Point {isStart ? 'A' : 'B'}</span>
            </div>
            <div className="leading-snug opacity-90 text-xs">
              Measure the distance between the pipes in the main line. Place your tape at this point.
            </div>
          </div>
        ) : (
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1 rounded-md" style={{ backgroundColor: `${color}20` }}>
                <span style={{ color }}>{interactionContent!.icon}</span>
              </div>
              <span className="font-semibold" style={{ color }}>{interactionContent!.title}</span>
            </div>
            <div className="leading-snug opacity-90 text-xs">
              {interactionContent!.description}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Helper: extract paired info points for animated lines
// Pairs are matched by prefix: e.g. "yjunction_start" <-> "yjunction_end"
// =============================================================================

function getPairedLines(infoPoints: Map<string, InfoPoint>): { prefix: string; start: InfoPoint; end: InfoPoint }[] {
  const byPrefix = new Map<string, { start?: InfoPoint; end?: InfoPoint }>()

  for (const point of infoPoints.values()) {
    const isStart = point.id.endsWith('_start')
    const isEnd = point.id.endsWith('_end')
    if (!isStart && !isEnd) continue

    const prefix = point.id.replace(/_start$|_end$/, '')
    const entry = byPrefix.get(prefix) || {}
    if (isStart) entry.start = point
    if (isEnd) entry.end = point
    byPrefix.set(prefix, entry)
  }

  const pairs: { prefix: string; start: InfoPoint; end: InfoPoint }[] = []
  for (const [prefix, { start, end }] of byPrefix) {
    if (start && end) pairs.push({ prefix, start, end })
  }
  return pairs
}

// =============================================================================
// Component: AnimatedMeasurementLine
// Draws from start->end info point positions (updates with camera movement).
// Uses CSS animations for draw/fade/repeat since coordinates update every frame.
// =============================================================================

interface AnimatedMeasurementLineProps {
  startPoint: InfoPoint
  endPoint: InfoPoint
  pairKey: string
  containerWidth: number
  containerHeight: number
}

function AnimatedMeasurementLine({ startPoint, endPoint, pairKey, containerWidth, containerHeight }: AnimatedMeasurementLineProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Convert normalized coordinates to pixels — updates every render as camera moves
  const startX = startPoint.x * containerWidth
  const startY = startPoint.y * containerHeight
  const endX = endPoint.x * containerWidth
  const endY = endPoint.y * containerHeight

  const dx = endX - startX
  const dy = endY - startY
  const length = Math.sqrt(dx * dx + dy * dy)

  // Midpoint for label
  const midX = (startX + endX) / 2
  const midY = (startY + endY) / 2

  const color = '#39BEAE'

  // CSS animation: draw, hold, fade — repeats 3 times
  // We use CSS for the opacity cycle and inline stroke-dashoffset for the draw.
  // Because coordinates change every frame (camera moves), we can't use SVG SMIL
  // <animate> (it bakes in start/end values). Instead we use CSS @keyframes.
  const drawDuration = 0.8
  const holdDuration = 0.6
  const fadeDuration = 0.5
  const pauseDuration = 0.3
  const cycleDuration = drawDuration + holdDuration + fadeDuration + pauseDuration

  const drawPct = (drawDuration / cycleDuration * 100).toFixed(1)
  const holdEndPct = ((drawDuration + holdDuration) / cycleDuration * 100).toFixed(1)
  const fadeEndPct = ((drawDuration + holdDuration + fadeDuration) / cycleDuration * 100).toFixed(1)
  const labelStartPct = ((drawDuration * 0.4) / cycleDuration * 100).toFixed(1)

  const animName = `measureDraw-${pairKey}`
  const labelAnimName = `measureLabel-${pairKey}`

  return (
    <>
      <style>{`
        @keyframes ${animName} {
          0% { stroke-dashoffset: ${length}; opacity: 1; }
          ${drawPct}% { stroke-dashoffset: 0; opacity: 1; }
          ${holdEndPct}% { stroke-dashoffset: 0; opacity: 1; }
          ${fadeEndPct}% { stroke-dashoffset: 0; opacity: 0; }
          100% { stroke-dashoffset: ${length}; opacity: 0; }
        }
        @keyframes ${animName}-glow {
          0% { opacity: 0; }
          ${drawPct}% { opacity: 0.2; }
          ${holdEndPct}% { opacity: 0.2; }
          ${fadeEndPct}% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes ${animName}-dot {
          0% { opacity: 0; }
          5% { opacity: 0.9; }
          ${holdEndPct}% { opacity: 0.8; }
          ${fadeEndPct}% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes ${labelAnimName} {
          0% { opacity: 0; transform: translateX(-50%) translateY(4px); }
          ${labelStartPct}% { opacity: 1; transform: translateX(-50%) translateY(0); }
          ${holdEndPct}% { opacity: 1; transform: translateX(-50%) translateY(0); }
          ${fadeEndPct}% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
        }
        @keyframes infoGlow {
          0%, 100% { opacity: 0.1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.25; transform: translate(-50%, -50%) scale(1.15); }
        }
      `}</style>

      <svg
        className="absolute pointer-events-none"
        style={{
          left: 0,
          top: 0,
          width: containerWidth,
          height: containerHeight,
          zIndex: 99,
          overflow: 'visible',
        }}
      >
        <defs>
          <filter id={`lineGlow-${pairKey}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background glow line */}
        <line
          x1={startX} y1={startY} x2={endX} y2={endY}
          stroke={color} strokeWidth="6" strokeLinecap="round"
          filter={`url(#lineGlow-${pairKey})`}
          style={{
            animation: `${animName}-glow ${cycleDuration}s ease-in-out 3`,
            animationFillMode: 'forwards',
          }}
        />

        {/* Main drawing line */}
        <line
          x1={startX} y1={startY} x2={endX} y2={endY}
          stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={length}
          style={{
            animation: `${animName} ${cycleDuration}s ease-in-out 3`,
            animationFillMode: 'forwards',
          }}
        />

        {/* Start dot */}
        <circle cx={startX} cy={startY} r="5" fill={color}
          style={{
            animation: `${animName}-dot ${cycleDuration}s ease-in-out 3`,
            animationFillMode: 'forwards',
          }}
        />

        {/* End dot */}
        <circle cx={endX} cy={endY} r="5" fill={color}
          style={{
            animation: `${animName}-dot ${cycleDuration}s ease-in-out 3`,
            animationFillMode: 'forwards',
          }}
        />
      </svg>

      {/* "measure here" label at midpoint */}
      <div
        className="absolute pointer-events-none flex items-center justify-center"
        style={{
          left: midX,
          top: midY - 24,
          transform: 'translateX(-50%)',
          zIndex: 100,
          animation: `${labelAnimName} ${cycleDuration}s ease-in-out 3`,
          animationFillMode: 'forwards',
        }}
      >
        <div
          className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase"
          style={{
            backgroundColor: isDark ? 'rgba(13, 29, 64, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            color,
            border: `1.5px solid ${color}`,
            boxShadow: `0 0 12px rgba(57, 190, 174, 0.3), 0 2px 8px rgba(0,0,0,0.2)`,
            backdropFilter: 'blur(8px)',
          }}
        >
          measure here
        </div>
      </div>
    </>
  )
}

// =============================================================================
// Component: InfoPointOverlay (bare container, kept for backwards compat)
// =============================================================================

export function InfoPointOverlay({ containerRef, className = '' }: InfoPointOverlayProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener('resize', updateSize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [containerRef])

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ zIndex: 50 }}
    />
  )
}

// =============================================================================
// Render Component with State
// =============================================================================

interface InfoPointOverlayWithStateProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  infoPoints: Map<string, InfoPoint>
  measurementLine: MeasurementLine | null
  className?: string
}

export function InfoPointOverlayWithState({
  containerRef,
  infoPoints,
  measurementLine,
  className = ''
}: InfoPointOverlayWithStateProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }

    updateSize()
    const timeoutId = setTimeout(updateSize, 100)

    const resizeObserver = new ResizeObserver(updateSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener('resize', updateSize)

    return () => {
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [containerRef])

  const shouldRenderMarkers = containerSize.width > 0 && containerSize.height > 0

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{
        zIndex: 20, // Below modals (z-30) but above the stream
        pointerEvents: 'none',
      }}
    >
      {shouldRenderMarkers && (
        <>
          {/* Animated measurement lines derived from info point pairs */}
          {measurementLine && getPairedLines(infoPoints).map(({ prefix, start, end }) => (
            <AnimatedMeasurementLine
              key={prefix}
              pairKey={prefix}
              startPoint={start}
              endPoint={end}
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
            />
          ))}

          {/* Info point markers — only render interaction points, not measurement A/B */}
          {Array.from(infoPoints.values())
            .filter(point => !point.id.endsWith('_start') && !point.id.endsWith('_end'))
            .map(point => (
              <InfoPointMarker
                key={point.id}
                point={point}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
              />
            ))}
        </>
      )}
    </div>
  )
}

export default InfoPointOverlay
