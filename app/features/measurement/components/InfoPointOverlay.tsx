'use client'

/**
 * InfoPointOverlay Component
 *
 * Displays measurement guidance on the stream:
 * - Info point markers: clickable icons that open explanation bubbles
 * - Animated measurement line: draws A->B, fades out, repeats 3 times
 *   with a "measure here" label
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTheme } from '@/app/context/ThemeContext'
import type { InfoPointData, MeasurementGuidanceData } from '@/app/lib/messageTypes'

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
  const [showBubble, setShowBubble] = useState(false)
  const bubbleRef = useRef<HTMLDivElement>(null)

  // Convert normalized coordinates to pixels
  const x = point.x * containerWidth
  const y = point.y * containerHeight

  // Determine if this is a start (A) or end (B) point
  const isStart = point.id.includes('start')
  const letter = isStart ? 'A' : 'B'
  const color = '#39BEAE'
  const baseSize = 20
  const size = baseSize * (point.scale || 1)

  // Close bubble on click outside
  useEffect(() => {
    if (!showBubble) return
    const handleClick = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setShowBubble(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showBubble])

  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
      }}
      ref={bubbleRef}
    >
      {/* Soft pulsing glow behind the marker */}
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

      {/* Clickable point marker with A/B letter */}
      <button
        onClick={() => setShowBubble(prev => !prev)}
        className="relative flex items-center justify-center rounded-full cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
        style={{
          width: size * 1.4,
          height: size * 1.4,
          backgroundColor: color,
          boxShadow: `0 0 ${size * 0.6}px ${color}, 0 2px 8px rgba(0,0,0,0.3)`,
          border: '2px solid rgba(255,255,255,0.8)',
          position: 'relative',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        aria-label={`Measurement point ${letter}`}
      >
        <span
          className="text-white font-bold select-none"
          style={{ fontSize: size * 0.55, lineHeight: 1 }}
        >
          {letter}
        </span>
      </button>

      {/* Info bubble */}
      {showBubble && (
        <div
          className="absolute whitespace-normal px-4 py-3 rounded-xl text-sm shadow-2xl animate-in fade-in zoom-in duration-200"
          style={{
            left: '50%',
            top: -(size * 1.2 + 12),
            transform: 'translateX(-50%) translateY(-100%)',
            width: 220,
            backgroundColor: isDark ? 'rgba(13, 29, 64, 0.95)' : 'rgba(255, 255, 255, 0.97)',
            color: isDark ? '#e2e8f0' : '#1e293b',
            border: `1.5px solid ${color}`,
            backdropFilter: 'blur(12px)',
            zIndex: 100,
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
          <div className="font-semibold mb-1" style={{ color }}>
            Point {letter}
          </div>
          <div className="leading-snug opacity-90 text-xs">
            Measure the distance between the pipes in the main line. Place your tape at this point.
          </div>
        </div>
      )}
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

          {/* Info point markers */}
          {Array.from(infoPoints.values()).map(point => (
            <div key={point.id} style={{ pointerEvents: 'auto' }}>
              <InfoPointMarker
                point={point}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
              />
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export default InfoPointOverlay
