'use client'

/**
 * ResumeConfirmationModal Component
 *
 * Shows confirmation when resuming a training session.
 * Built on BaseModal for consistent styling.
 */

import { Play, RotateCcw } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'
import { BaseModal, ModalMessage, ModalFooter } from '@/app/components/shared'
import { Button } from '@/app/components/shared'
import { TASK_SEQUENCE } from '@/app/config'

// =============================================================================
// Props Interface
// =============================================================================

interface ResumeConfirmationModalProps {
  isOpen: boolean
  phaseIndex: number
  onStartTraining: () => void
  loading?: boolean
}

// =============================================================================
// Helper Functions
// =============================================================================

function getPhaseInfo(index: number) {
  if (index < 0 || index >= TASK_SEQUENCE.length) {
    return { name: 'Start', tool: 'None' }
  }
  const task = TASK_SEQUENCE[index]
  return {
    name: task?.name || 'Unknown Phase',
    tool: task?.tool || 'None',
  }
}

// =============================================================================
// Component
// =============================================================================

export function ResumeConfirmationModal({
  isOpen,
  phaseIndex,
  onStartTraining,
  loading = false,
}: ResumeConfirmationModalProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const phaseInfo = getPhaseInfo(phaseIndex)
  const isFromStart = phaseIndex === 0
  const progress = Math.round((phaseIndex / TASK_SEQUENCE.length) * 100)

  const title = isFromStart ? 'Start Training' : 'Resume Training'
  const message = isFromStart ? 'Ready!' : 'Continue!'
  const subText = isFromStart
    ? 'Begin your training from Phase 1'
    : `Resume from Phase ${phaseIndex + 1}: ${phaseInfo.name} (${progress}% complete)`

  return (
    <BaseModal
      isOpen={isOpen}
      title={title}
      showCloseButton={false}
      closeOnBackdropClick={false}
      size="md"
    >
      {/* Content */}
      <ModalMessage
        icon={isFromStart
          ? <Play size={30} color="#70FFC6" />
          : <RotateCcw size={30} color="#70FFC6" />
        }
        message={message}
        subText={subText}
      />

      {/* Progress Bar (only for resume) */}
      {!isFromStart && (
        <div className="px-5 pb-4">
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
            <div
              className="h-full bg-gradient-to-r from-[#39BEAE] to-[#44CF8A] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Button */}
      <ModalFooter>
        <Button
          variant="primary"
          size="lg"
          onClick={onStartTraining}
          isLoading={loading}
          leftIcon={isFromStart ? <Play size={20} /> : <RotateCcw size={20} />}
        >
          {isFromStart ? 'Start Training' : 'Resume Training'}
        </Button>
      </ModalFooter>
    </BaseModal>
  )
}

export default ResumeConfirmationModal
