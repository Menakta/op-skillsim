'use client'

/**
 * InfoPointOverlay Component
 *
 * Displays measurement start/end point markers on the stream.
 * Points are positioned using normalized coordinates (0-1) from UE5.
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
        // Hide/remove the point
        next.delete(data.id)
      } else {
        // Show/update the point
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
// Component: InfoPointMarker
// =============================================================================

interface InfoPointMarkerProps {
  point: InfoPoint
  containerWidth: number
  containerHeight: number
}

function InfoPointMarker({ point, containerWidth, containerHeight }: InfoPointMarkerProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Convert normalized coordinates to pixels
  const x = point.x * containerWidth
  const y = point.y * containerHeight

  // Determine if this is a start or end point based on id
  const isStart = point.id.includes('start')
  const color = isStart ? '#39BEAE' : '#79CFC2'

  // Scale the marker size
  const baseSize = 16
  const size = baseSize * (point.scale || 1)

  return (
    <div
      className="absolute pointer-events-none animate-in fade-in zoom-in duration-300"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        zIndex: 100,
      }}
    >
      {/* Outer pulsing ring */}
      <div
        className="absolute rounded-full animate-ping"
        style={{
          width: size * 2.5,
          height: size * 2.5,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: color,
          opacity: 0.3,
        }}
      />

      {/* Middle ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 1.8,
          height: size * 1.8,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: color,
          opacity: 0.4,
        }}
      />

      {/* Inner dot */}
      <div
        className="absolute rounded-full shadow-lg"
        style={{
          width: size,
          height: size,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: color,
          boxShadow: `0 0 ${size}px ${color}`,
        }}
      />

      {/* Label */}
      {point.label && (
        <div
          className="absolute whitespace-nowrap px-2 py-1 rounded-md text-xs font-medium shadow-lg"
          style={{
            left: '50%',
            top: size * 1.5 + 8,
            transform: 'translateX(-50%)',
            backgroundColor: isDark ? 'rgba(13, 29, 64, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            color: isDark ? '#fff' : '#0D1D40',
            border: `1px solid ${color}`,
          }}
        >
          {point.label}
        </div>
      )}

      {/* Point letter indicator (A for start, B for end) */}
      <div
        className="absolute flex items-center justify-center rounded-full text-white text-xs font-bold"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'transparent',
        }}
      >
        {isStart ? 'A' : 'B'}
      </div>
    </div>
  )
}

// =============================================================================
// Component: MeasurementLineOverlay
// =============================================================================

interface MeasurementLineOverlayProps {
  line: MeasurementLine
  containerWidth: number
  containerHeight: number
}

function MeasurementLineOverlay({ line, containerWidth, containerHeight }: MeasurementLineOverlayProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Convert normalized coordinates to pixels
  const startX = line.startX * containerWidth
  const startY = line.startY * containerHeight
  const endX = line.endX * containerWidth
  const endY = line.endY * containerHeight

  // Calculate line properties
  const dx = endX - startX
  const dy = endY - startY
  const length = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)

  // Midpoint for distance label
  const midX = (startX + endX) / 2
  const midY = (startY + endY) / 2

  return (
    <>
      {/* Measurement line */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: startX,
          top: startY,
          width: length,
          height: 3,
          transform: `rotate(${angle}deg)`,
          transformOrigin: '0 50%',
          background: 'linear-gradient(90deg, #39BEAE, #79CFC2)',
          zIndex: 99,
          boxShadow: '0 0 8px rgba(57, 190, 174, 0.5)',
        }}
      />

      {/* Dashed line effect */}
      <svg
        className="absolute pointer-events-none"
        style={{
          left: 0,
          top: 0,
          width: containerWidth,
          height: containerHeight,
          zIndex: 98,
        }}
      >
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#39BEAE"
          strokeWidth="1"
          strokeDasharray="5,5"
          opacity="0.5"
        />
      </svg>

      {/* Distance label */}
      {line.distance > 0 && (
        <div
          className="absolute pointer-events-none px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg"
          style={{
            left: midX,
            top: midY - 30,
            transform: 'translateX(-50%)',
            backgroundColor: isDark ? 'rgba(13, 29, 64, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            color: '#39BEAE',
            border: '2px solid #39BEAE',
            zIndex: 101,
          }}
        >
          {line.distance.toFixed(1)} mm
        </div>
      )}
    </>
  )
}

// =============================================================================
// Main Component: InfoPointOverlay
// =============================================================================

export function InfoPointOverlay({ containerRef, className = '' }: InfoPointOverlayProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Update container size on resize
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

  // This component only provides the visual container
  // State management is done via useInfoPoints hook
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

  // Update container size on resize
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

  if (containerSize.width === 0 || containerSize.height === 0) {
    return null
  }

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ zIndex: 50 }}
    >
      {/* Measurement line */}
      {measurementLine && (
        <MeasurementLineOverlay
          line={measurementLine}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
        />
      )}

      {/* Info points */}
      {Array.from(infoPoints.values()).map(point => (
        <InfoPointMarker
          key={point.id}
          point={point}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
        />
      ))}
    </div>
  )
}

export default InfoPointOverlay
