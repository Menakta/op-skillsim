'use client'

import { Play, History, Plus, Clock, CheckCircle2 } from 'lucide-react'
import { TASK_SEQUENCE } from '@/app/config'

// =============================================================================
// Types
// =============================================================================

export interface ActiveSession {
  id: string
  session_id: string
  course_name: string
  current_training_phase: string
  overall_progress: number
  status: string
  phases_completed: number
  created_at: string
  updated_at: string
}

interface SessionSelectionScreenProps {
  isOpen: boolean
  sessions: ActiveSession[]
  onResumeSession: (session: ActiveSession) => void
  onStartNewSession: () => void
  loading?: boolean
}

// =============================================================================
// Helper Functions
// =============================================================================

function getPhaseInfo(phaseIndex: string | number) {
  const index = typeof phaseIndex === 'string' ? parseInt(phaseIndex, 10) : phaseIndex
  if (isNaN(index) || index < 0 || index >= TASK_SEQUENCE.length) {
    return { name: 'Not Started', icon: '🔍' }
  }
  const task = TASK_SEQUENCE[index]
  return {
    name: task?.name || 'Unknown Phase',
    icon: getPhaseIcon(index),
  }
}

function getPhaseIcon(index: number): string {
  const icons = ['🔍', '⛏️', '📏', '🔧', '🧴', '🔬', '✅']
  return icons[index] || '📋'
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  return date.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

// =============================================================================
// Component
// =============================================================================

export function SessionSelectionScreen({
  isOpen,
  sessions,
  onResumeSession,
  onStartNewSession,
  loading = false,
}: SessionSelectionScreenProps) {
  if (!isOpen) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl mx-4"
        style={{
          animation: 'modalFadeIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-white text-4xl font-bold mb-3">Welcome Back!</h1>
          <p className="text-white/70 text-lg">
            You have active training sessions. Choose to continue or start fresh.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Active Sessions */}
          {sessions.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-[#39BEAE]" />
                <h2 className="text-white text-lg font-semibold">Continue Training</h2>
              </div>

              <div className="space-y-3">
                {sessions.map((session) => {
                  const phaseInfo = getPhaseInfo(session.current_training_phase)
                  const phaseIndex = parseInt(session.current_training_phase, 10)
                  const progress = Math.round((phaseIndex / TASK_SEQUENCE.length) * 100)

                  return (
                    <button
                      key={session.id}
                      onClick={() => onResumeSession(session)}
                      disabled={loading}
                      className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#39BEAE]/50 rounded-xl transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-[#39BEAE]/20 rounded-xl flex items-center justify-center text-2xl">
                            {phaseInfo.icon}
                          </div>
                          <div>
                            <div className="text-white font-medium flex items-center gap-2">
                              Phase {phaseIndex + 1}: {phaseInfo.name}
                              {progress >= 100 && (
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                              )}
                            </div>
                            <div className="text-white/50 text-sm flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(session.updated_at)}
                              </span>
                              <span>•</span>
                              <span>{progress}% complete</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#39BEAE] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Resume
                          </span>
                          <Play className="w-5 h-5 text-[#39BEAE] group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#39BEAE] to-[#44CF8A] rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Start New Session */}
          <button
            onClick={onStartNewSession}
            disabled={loading}
            className="w-full p-6 bg-gradient-to-r from-[#39BEAE] to-[#44CF8A] hover:from-[#2ea89a] hover:to-[#3ab87a] rounded-2xl transition-all duration-300 shadow-lg shadow-[#39BEAE]/30 hover:shadow-[#39BEAE]/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-3">
              <Plus className="w-6 h-6 text-white" />
              <span className="text-white text-lg font-semibold">
                {sessions.length > 0 ? 'Start New Training Session' : 'Start Training'}
              </span>
            </div>
            {sessions.length > 0 && (
              <p className="text-white/80 text-sm mt-2">
                Begin a fresh training session from the beginning
              </p>
            )}
          </button>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="text-center mt-4">
            <div className="inline-flex items-center gap-2 text-white/70">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default SessionSelectionScreen
