'use client'

/**
 * SessionSelectionScreen Component
 *
 * Shows active training sessions for students to resume or start new.
 * Uses app theme styling consistent with other screens.
 */

import { Play, History, Plus, Clock } from 'lucide-react'
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
    return { name: 'Not Started' }
  }
  const task = TASK_SEQUENCE[index]
  return {
    name: task?.name || 'Unknown Phase',
  }
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
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-lg mx-4"
        style={{
          animation: 'modalFadeIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-white text-[40px] font-bold mb-2">Welcome Back!</h1>
          <p className="text-gray-300 text-lg">
            {sessions.length > 0
              ? 'Continue your training or start fresh'
              : 'Ready to begin your training?'
            }
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-[#000000]/40 backdrop-blur-md rounded-2xl border border-gray-700/50 overflow-hidden">
          {/* Active Sessions */}
          {sessions.length > 0 && (
            <div className="p-5 border-b border-gray-700/50">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-[#39BEAE]" />
                <h2 className="text-white text-base font-medium">Continue Training</h2>
              </div>

              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {sessions.map((session) => {
                  const phaseInfo = getPhaseInfo(session.current_training_phase)
                  const phaseIndex = parseInt(session.current_training_phase, 10)
                  const progress = Math.round((phaseIndex / TASK_SEQUENCE.length) * 100)

                  return (
                    <button
                      key={session.id}
                      onClick={() => onResumeSession(session)}
                      disabled={loading}
                      className="w-full p-4 bg-black/20 hover:bg-black/30 border border-gray-500/30 hover:border-[#39BEAE]/50 rounded-xl transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-[#39BEAE] text-sm font-medium mb-1">
                            {session.course_name || 'VR Pipe Training'}
                          </div>
                          <div className="text-white font-medium">
                            Phase {phaseIndex + 1}: {phaseInfo.name}
                          </div>
                          <div className="text-gray-400 text-sm flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(session.updated_at)}</span>
                            <span className="text-gray-500">•</span>
                            <span>{progress}% complete</span>
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
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
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
          <div className="p-5">
            <button
              onClick={onStartNewSession}
              disabled={loading}
              className="w-full py-3 px-6 bg-[#44CF8A] hover:bg-[#39BEAE] rounded-full transition-all duration-300 shadow-lg shadow-[#39BEAE]/30 hover:shadow-[#44CF8A]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-white text-lg font-medium">Loading...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-white" />
                  <span className="text-white text-lg font-medium">
                    {sessions.length > 0 ? 'Start New Session' : 'Start Training'}
                  </span>
                </>
              )}
            </button>
            {sessions.length > 0 && (
              <p className="text-gray-500 text-sm text-center mt-3">
                Begin a fresh training from the start
              </p>
            )}
          </div>
        </div>
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
