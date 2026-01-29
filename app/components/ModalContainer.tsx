'use client'

/**
 * Modal Container Component
 *
 * Centralizes all modal rendering in StreamingApp.
 * Reduces JSX complexity in the main component.
 */

import dynamic from 'next/dynamic'
import { RETRY_CONFIG } from '../config'
import type { UseModalManagerReturn } from '../hooks/useModalManager'
import type { QuestionData } from '../lib/messageTypes'

// =============================================================================
// Dynamic Modal Imports
// =============================================================================

const QuestionModal = dynamic(
  () => import('../features/questions').then(mod => ({ default: mod.QuestionModal })),
  { ssr: false, loading: () => null }
)
const NavigationWalkthrough = dynamic(
  () => import('../features').then(mod => ({ default: mod.NavigationWalkthrough })),
  { ssr: false, loading: () => null }
)
const SuccessModal = dynamic(
  () => import('../features').then(mod => ({ default: mod.SuccessModal })),
  { ssr: false, loading: () => null }
)
const ErrorModal = dynamic(
  () => import('../features').then(mod => ({ default: mod.ErrorModal })),
  { ssr: false, loading: () => null }
)
const SessionModal = dynamic(
  () => import('../features').then(mod => ({ default: mod.SessionModal })),
  { ssr: false, loading: () => null }
)
const TrainingCompleteModal = dynamic(
  () => import('../features').then(mod => ({ default: mod.TrainingCompleteModal })),
  { ssr: false, loading: () => null }
)
const SessionExpiryModal = dynamic(
  () => import('../features').then(mod => ({ default: mod.SessionExpiryModal })),
  { ssr: false, loading: () => null }
)
const QuitTrainingModal = dynamic(
  () => import('../features').then(mod => ({ default: mod.QuitTrainingModal })),
  { ssr: false, loading: () => null }
)
const ResumeConfirmationModal = dynamic(
  () => import('../features').then(mod => ({ default: mod.ResumeConfirmationModal })),
  { ssr: false, loading: () => null }
)
const IdleWarningModal = dynamic(
  () => import('../features/idle').then(mod => ({ default: mod.IdleWarningModal })),
  { ssr: false, loading: () => null }
)

// =============================================================================
// Types
// =============================================================================

interface QuestionActionsType {
  submit: (selectedAnswer: number) => { correct: boolean; message: string } | undefined
  close: () => void
}

interface PhaseActionsType {
  continue: () => void
  retry: () => void
}

interface ConnectionActionsType {
  retry: () => void
  refresh: () => void
}

interface SessionEndActionsType {
  login: () => void
  expiry: () => void
  idle: () => void
  trainingComplete: () => void
}

interface SessionActionsType {
  confirmResume: () => void
}

interface TrainingControlActionsType {
  quitConfirm: () => Promise<void>
  quitCancel: () => void
}

interface TrainingStateType {
  questionTryCount: number
  totalTasks: number
  progress: number
  currentTaskIndex: number
}

export interface ModalContainerProps {
  // Modal manager
  modals: UseModalManagerReturn

  // Training state
  trainingState: TrainingStateType

  // Session info
  isLtiSession: boolean
  sessionReturnUrl: string | null
  userRole: 'student' | 'teacher' | 'admin'
  isTestUser: boolean
  sessionExpiresAt: number | null
  sessionsLoading: boolean

  // Idle state
  isIdle: boolean
  resetIdle: () => void

  // Action handlers
  questionActions: QuestionActionsType
  phaseActions: PhaseActionsType
  connectionActions: ConnectionActionsType
  sessionEndActions: SessionEndActionsType
  sessionActions: SessionActionsType
  trainingControlActions: TrainingControlActionsType

  // Navigation walkthrough handler
  onCloseNavigationWalkthrough: () => void
}

// =============================================================================
// Component
// =============================================================================

export default function ModalContainer({
  modals,
  trainingState,
  isLtiSession,
  sessionReturnUrl,
  userRole,
  isTestUser,
  sessionExpiresAt,
  sessionsLoading,
  isIdle,
  resetIdle,
  questionActions,
  phaseActions,
  connectionActions,
  sessionEndActions,
  sessionActions,
  trainingControlActions,
  onCloseNavigationWalkthrough,
}: ModalContainerProps) {
  return (
    <>
      {/* Question Modal */}
      <QuestionModal
        question={modals.showingQuestion}
        tryCount={trainingState.questionTryCount}
        onSubmitAnswer={questionActions.submit}
        onClose={questionActions.close}
      />

      {/* Training Complete Modal - Shows when all phases are completed */}
      <TrainingCompleteModal
        isOpen={modals.isOpen('trainingComplete')}
        totalTasks={trainingState.totalTasks}
        progress={trainingState.progress}
        isLti={isLtiSession}
        returnUrl={sessionReturnUrl}
        role={userRole}
        onClose={sessionEndActions.trainingComplete}
      />

      {/* Phase Success Modal */}
      <SuccessModal
        isOpen={modals.isOpen('phaseSuccess')}
        title={modals.completedPhase ? modals.completedPhase.taskName + ' Task Completed' : 'Task Completed'}
        message={modals.completedPhase ? `Success!` : ''}
        successText={modals.completedPhase ? `${modals.completedPhase.taskName} Task completed successfully!` : 'Phase completed successfully!'}
        onContinue={phaseActions.continue}
        onRetry={phaseActions.retry}
        continueButtonText="Continue"
        retryButtonText="Retry"
        showRetryButton={true}
      />

      {/* Stream Error Modal */}
      <ErrorModal
        isOpen={modals.isOpen('error')}
        title="Connection Failed"
        message="Error!"
        errorText={modals.initError || `Unable to connect to stream. Attempted ${RETRY_CONFIG.maxRetries} automatic retries.`}
        onRetry={connectionActions.retry}
        onClose={connectionActions.refresh}
        retryButtonText="Try Again"
        closeButtonText="Refresh Page"
        showCloseButton={true}
      />

      {/* Navigation Walkthrough - Show first when app opens */}
      <NavigationWalkthrough
        isOpen={modals.isOpen('navigationWalkthrough')}
        onClose={onCloseNavigationWalkthrough}
      />

      {/* Resume Confirmation Modal - Show after stream connects when resuming */}
      <ResumeConfirmationModal
        isOpen={modals.isOpen('resumeConfirmation')}
        phaseIndex={modals.resumePhaseIndex}
        onStartTraining={sessionActions.confirmResume}
        loading={sessionsLoading}
      />

      {/* Session End Modal - Show when session is disconnected/closed */}
      <SessionModal
        isOpen={modals.isOpen('sessionEnd')}
        reason={modals.sessionEndReason}
        onLogin={sessionEndActions.login}
        loginButtonText={isTestUser ? "Back to Login" : "Close"}
      />

      {/* Session Expiry Modal - Shows countdown when session is about to expire */}
      <SessionExpiryModal
        isOpen={modals.isOpen('sessionExpiry')}
        expiresAt={sessionExpiresAt || Date.now()}
        isLti={isLtiSession}
        returnUrl={sessionReturnUrl}
        role={userRole}
        progress={trainingState.progress}
        phasesCompleted={trainingState.currentTaskIndex}
        totalPhases={trainingState.totalTasks}
        onSessionEnd={sessionEndActions.expiry}
      />

      {/* Idle Warning Modal - Shows when user is inactive for 5 minutes */}
      <IdleWarningModal
        isOpen={isIdle}
        countdownDuration={300}
        onStayActive={resetIdle}
        onTimeout={sessionEndActions.idle}
      />

      {/* Quit Training Modal - Confirmation when user clicks quit */}
      <QuitTrainingModal
        isOpen={modals.isOpen('quitTraining')}
        onConfirm={trainingControlActions.quitConfirm}
        onCancel={trainingControlActions.quitCancel}
        currentPhase={trainingState.currentTaskIndex}
        totalPhases={trainingState.totalTasks}
        isLti={isLtiSession}
      />
    </>
  )
}
