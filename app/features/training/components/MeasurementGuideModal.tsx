'use client'

import { useEffect, useState } from 'react'
import { X, Check, XIcon, Ruler, ArrowRight } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'

const COLORS = {
  primary: '#39BEAE',
  secondary: '#79CFC2',
  error: '#df5e5e',
  errorDark: '#E07070',
}

// =============================================================================
// SVG Point Marker
// =============================================================================

function SvgPoint({ cx, cy, label, color, faded }: {
  cx: number; cy: number; label: string; color: string; faded?: boolean
}) {
  return (
    <g opacity={faded ? 0.25 : 1}>
      {/* Outer pulse */}
      {!faded && (
        <circle cx={cx} cy={cy} r="18" fill="none" stroke={color} strokeWidth="1.2" opacity="0.25">
          <animate attributeName="r" values="15;21;15" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.25;0.08;0.25" dur="2.5s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Core circle */}
      <circle cx={cx} cy={cy} r="11" fill={color} opacity="0.15" />
      <circle cx={cx} cy={cy} r="8" fill={color} />
      {/* Label */}
      <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize="8.5" fontWeight="700" fontFamily="system-ui, sans-serif"
        style={{ pointerEvents: 'none' }}>
        {label}
      </text>
    </g>
  )
}

// =============================================================================
// Wrong Way Scene (A -> C)
// =============================================================================

function WrongWayScene({ isDark }: { isDark: boolean }) {
  const ax = 55, ay = 65
  const bx = 295, by = 65
  const cx2 = 210, cy2 = 135
  const lineLen = Math.sqrt((cx2 - ax) ** 2 + (cy2 - ay) ** 2)

  return (
    <svg viewBox="0 0 350 175" className="w-full h-full" style={{ display: 'block' }}>
      <defs>
        <filter id="wGlow"><feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Faded correct path */}
      <line x1={ax} y1={ay} x2={bx} y2={by}
        stroke={COLORS.primary} strokeWidth="1" strokeDasharray="5,5" opacity="0.12" />

      {/* Wrong line glow */}
      <line x1={ax} y1={ay} x2={cx2} y2={cy2}
        stroke={COLORS.error} strokeWidth="8" strokeLinecap="round" opacity="0"
        strokeDasharray={lineLen} strokeDashoffset={lineLen}>
        <animate attributeName="stroke-dashoffset" from={String(lineLen)} to="0"
          dur="1s" begin="0s;4s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
        <animate attributeName="opacity" values="0;0.12;0.12;0" keyTimes="0;0.08;0.6;1" dur="4s" repeatCount="indefinite" />
      </line>

      {/* Wrong line */}
      <line x1={ax} y1={ay} x2={cx2} y2={cy2}
        stroke={COLORS.error} strokeWidth="2" strokeLinecap="round"
        filter="url(#wGlow)"
        strokeDasharray={lineLen} strokeDashoffset={lineLen}>
        <animate attributeName="stroke-dashoffset" from={String(lineLen)} to="0"
          dur="1s" begin="0s;4s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
      </line>

      {/* Dot */}
      <circle r="3" fill="white" opacity="0">
        <animateMotion path={`M${ax},${ay} L${cx2},${cy2}`} dur="1s" begin="0s;4s" fill="freeze"
          calcMode="spline" keySplines="0.4 0 0.2 1" />
        <animate attributeName="opacity" values="0;0.85;0.85;0" keyTimes="0;0.05;0.7;1" dur="1s" begin="0s;4s" fill="freeze" />
      </circle>

      {/* Result badge */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.28;0.33;0.88;1" dur="4s" repeatCount="indefinite" />
        <rect x="110" y="145" width="130" height="22" rx="11" fill={isDark ? '#1a1020' : '#2a1525'} opacity="0.9" />
        <rect x="109.5" y="144.5" width="131" height="23" rx="11.5" fill="none" stroke={COLORS.error} strokeWidth="0.8" opacity="0.5" />
        <text x="175" y="159" textAnchor="middle" fill={COLORS.error} fontSize="9.5" fontWeight="600" fontFamily="system-ui, sans-serif">
          &#10005;  A &#8594; C  Incorrect
        </text>
      </g>

      <SvgPoint cx={ax} cy={ay} label="A" color={COLORS.primary} />
      <SvgPoint cx={bx} cy={by} label="B" color={COLORS.primary} faded />
      <SvgPoint cx={cx2} cy={cy2} label="C" color={COLORS.error} />
    </svg>
  )
}

// =============================================================================
// Correct Way Scene (A -> B)
// =============================================================================

function CorrectWayScene({ isDark }: { isDark: boolean }) {
  const ax = 55, ay = 85
  const bx = 295, by = 85
  const lineLen = bx - ax

  return (
    <svg viewBox="0 0 350 175" className="w-full h-full" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="cGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={COLORS.primary} />
          <stop offset="100%" stopColor={COLORS.secondary} />
        </linearGradient>
        <filter id="cGlow"><feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Guide dashes */}
      <line x1={ax} y1={ay} x2={bx} y2={by}
        stroke={COLORS.primary} strokeWidth="1" strokeDasharray="5,5" opacity="0.12" />

      {/* Glow */}
      <line x1={ax} y1={ay} x2={bx} y2={by}
        stroke={COLORS.primary} strokeWidth="8" strokeLinecap="round" opacity="0"
        strokeDasharray={lineLen} strokeDashoffset={lineLen}>
        <animate attributeName="stroke-dashoffset" from={String(lineLen)} to="0"
          dur="1s" begin="0s;4s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
        <animate attributeName="opacity" values="0;0.12;0.12;0" keyTimes="0;0.08;0.6;1" dur="4s" repeatCount="indefinite" />
      </line>

      {/* Main line */}
      <line x1={ax} y1={ay} x2={bx} y2={by}
        stroke="url(#cGrad)" strokeWidth="2" strokeLinecap="round"
        filter="url(#cGlow)"
        strokeDasharray={lineLen} strokeDashoffset={lineLen}>
        <animate attributeName="stroke-dashoffset" from={String(lineLen)} to="0"
          dur="1s" begin="0s;4s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
      </line>

      {/* Dot */}
      <circle r="3" fill="white" opacity="0">
        <animateMotion path={`M${ax},${ay} L${bx},${by}`} dur="1s" begin="0s;4s" fill="freeze"
          calcMode="spline" keySplines="0.4 0 0.2 1" />
        <animate attributeName="opacity" values="0;0.85;0.85;0" keyTimes="0;0.05;0.7;1" dur="1s" begin="0s;4s" fill="freeze" />
      </circle>

      {/* Result badge */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.28;0.33;0.88;1" dur="4s" repeatCount="indefinite" />
        <rect x="130" y="115" width="90" height="22" rx="11" fill={isDark ? '#0a1a2a' : '#0D1D40'} opacity="0.9" />
        <rect x="129.5" y="114.5" width="91" height="23" rx="11.5" fill="none" stroke={COLORS.primary} strokeWidth="0.8" opacity="0.5" />
        <text x="175" y="129" textAnchor="middle" fill={COLORS.primary} fontSize="9.5" fontWeight="600" fontFamily="system-ui, sans-serif">
          &#10003;  1.25 m
        </text>
      </g>

      <SvgPoint cx={ax} cy={ay} label="A" color={COLORS.primary} />
      <SvgPoint cx={bx} cy={by} label="B" color={COLORS.secondary} />
    </svg>
  )
}

// =============================================================================
// Main Modal
// =============================================================================

interface MeasurementGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

export function MeasurementGuideModal({ isOpen, onClose }: MeasurementGuideModalProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [showCorrect, setShowCorrect] = useState(false)

  useEffect(() => {
    if (!isOpen) { setShowCorrect(false); return }
    const interval = setInterval(() => setShowCorrect(prev => !prev), 4000)
    return () => clearInterval(interval)
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center backdrop-blur-sm"
      style={{ animation: 'modalFadeIn 0.3s ease-out', backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.3)' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal card */}
      <div
        className={`relative w-full max-w-[440px] mx-2 rounded-2xl shadow-2xl border backdrop-blur-md ${
          isDark
            ? 'bg-[#000000]/55 border-gray-700/50'
            : 'bg-white/88 border-gray-200'
        }`}
        style={{ animation: 'modalFadeIn 0.3s ease-out' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isDark ? 'border-gray-700/50' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-full ${isDark ? 'bg-[#39BEAE]/15' : 'bg-[#39BEAE]/10'}`}>
              <Ruler className="w-4 h-4 text-[#39BEAE]" />
            </div>
            <h3 className={`text-base font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              How to Measure
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`w-6 h-6 flex items-center justify-center rounded-full transition-all duration-300 ${
              isDark
                ? 'bg-[#000000]/70 hover:bg-gray-600'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <X className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Animation area */}
        <div className="px-5 py-4">
          {/* Tab toggle */}
          <div className={`flex p-1 mb-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            <button
              onClick={() => setShowCorrect(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                !showCorrect
                  ? isDark
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-red-50 text-red-500 border border-red-200'
                  : isDark
                    ? 'text-gray-500 hover:text-gray-400'
                    : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              <XIcon className="w-3 h-3" />
              Wrong
            </button>
            <button
              onClick={() => setShowCorrect(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                showCorrect
                  ? isDark
                    ? 'bg-[#39BEAE]/20 text-[#39BEAE] border border-[#39BEAE]/40'
                    : 'bg-[#39BEAE]/10 text-[#39BEAE] border border-[#39BEAE]/30'
                  : isDark
                    ? 'text-gray-500 hover:text-gray-400'
                    : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              <Check className="w-3 h-3" />
              Correct
            </button>
          </div>

          {/* SVG scene */}
          <div className={`relative rounded-xl overflow-hidden transition-colors duration-500 ${
            isDark ? 'bg-white/[0.03]' : 'bg-gray-50'
          }`} style={{ height: 175 }}>
            {showCorrect
              ? <CorrectWayScene isDark={isDark} />
              : <WrongWayScene isDark={isDark} />
            }
          </div>

          {/* Description */}
          <div className="mt-4">
            {showCorrect ? (
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-[#39BEAE]/10 border-[#39BEAE]/20' : 'bg-[#39BEAE]/5 border-[#39BEAE]/15'
              }`}>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Always measure from <span className="font-semibold text-[#39BEAE]">Point A</span> to <span className="font-semibold text-[#79CFC2]">Point B</span> along the main pipe line for accurate results.
                </p>
              </div>
            ) : (
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200/50'
              }`}>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Measuring to the wrong point <span className={`font-semibold ${isDark ? 'text-red-400' : 'text-red-500'}`}>(C)</span> gives an inaccurate distance. Always follow the main line from A to B.
                </p>
              </div>
            )}
          </div>

          {/* Steps */}
          {showCorrect && (
            <div className="flex items-center gap-2 mt-4">
              {[
                { num: '1', text: 'Tap Start', color: COLORS.primary },
                { num: '', text: '', color: '' },
                { num: '2', text: 'Tap End', color: COLORS.secondary },
                { num: '', text: '', color: '' },
                { num: '3', text: 'Get Result', color: isDark ? '#fff' : '#0D1D40' },
              ].map((step, i) =>
                step.num ? (
                  <div key={i} className={`flex-1 py-2.5 rounded-xl text-center border ${
                    isDark ? 'bg-white/[0.03] border-gray-700/50' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="text-sm font-bold mb-0.5" style={{ color: step.color }}>{step.num}</div>
                    <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{step.text}</div>
                  </div>
                ) : (
                  <ArrowRight key={i} className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                )
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 pb-5`}>
          <button
            onClick={showCorrect ? onClose : () => setShowCorrect(true)}
            className="w-full py-2.5 rounded-full font-medium text-sm text-white transition-all duration-200 active:scale-[0.98] bg-[#39BEAE] hover:bg-[#2EA89A] shadow-lg shadow-[#39BEAE]/20"
          >
            {showCorrect ? 'Got it, Start Measuring' : 'Show Correct Way'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default MeasurementGuideModal
