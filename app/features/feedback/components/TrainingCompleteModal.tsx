'use client'

/**
 * TrainingCompleteModal Component
 *
 * Displays when student completes all training phases.
 * Allows student to export their training report as PDF.
 * Redirects to session-complete page for proper cleanup.
 */

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle, Download } from "lucide-react"
import { BaseModal, ModalMessage, ModalFooter } from '@/app/components/shared'
import { Button } from '@/app/components/shared'
import { redirectToSessionComplete } from '@/app/lib/sessionCompleteRedirect'
import { generateResultPDF } from '@/app/components/ResultExportPDF'
import type { ResultPDFData } from '@/app/components/ResultExportPDF'

// =============================================================================
// Props Interface
// =============================================================================

interface TrainingCompleteModalProps {
  isOpen: boolean
  totalTasks: number
  progress: number
  isLti: boolean
  returnUrl?: string | null
  role?: 'student' | 'teacher' | 'admin'
  onClose: () => void
}

// =============================================================================
// Component
// =============================================================================

export function TrainingCompleteModal({
  isOpen,
  totalTasks,
  progress,
  isLti,
  returnUrl,
  role = 'student',
  onClose
}: TrainingCompleteModalProps) {
  const [isExporting, setIsExporting] = useState(false)

  const isStaff = role === 'admin' || role === 'teacher'

  const handleContinue = () => {
    if (isStaff) {
      // Staff: redirect back to admin panel without clearing session
      window.location.href = '/admin'
      return
    }

    // Students: redirect to session-complete page for proper cleanup
    redirectToSessionComplete({
      reason: 'completed',
      role,
      progress,
      phasesCompleted: totalTasks,
      totalPhases: totalTasks,
      returnUrl,
      isLti,
    })
  }

  const handleExportReport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/training/export', {
        method: 'GET',
        credentials: 'include',
      })

      const result = await response.json()

      if (!result.success || !result.data) {
        console.warn('Failed to fetch export data:', result.error)
        return
      }

      const pdfData: ResultPDFData = {
        student: {
          full_name: result.data.student?.full_name || 'N/A',
          email: result.data.student?.email || 'N/A',
          course_name: result.data.student?.course_name || 'OP-Skillsim Plumbing Training',
          institution: result.data.student?.institution || 'Open Polytechnic Kuratini Tuwhera',
        },
        session: {
          phases_completed: result.data.session?.phases_completed || 0,
          total_time_spent: result.data.session?.total_time_spent || 0,
          overall_progress: result.data.session?.overall_progress || 0,
        },
        questionData: result.data.questionData || {},
      }

      await generateResultPDF(pdfData)
    } catch (error) {
      console.error('Failed to export report:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const getButtonText = () => {
    if (isStaff) {
      return 'Back to Dashboard'
    }
    if (isLti && returnUrl) {
      return 'Return to Course'
    } else if (!isLti) {
      return 'Back to Login'
    }
    return 'Continue'
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleContinue}
      title="Training Complete"
      showCloseButton={true}
      closeButtonColor="teal"
    >
      {/* Content */}
      <ModalMessage
        icon={<CheckCircle size={30} color="#39BEAE" />}
        message="Congratulations!"
        subText={`You have successfully completed all ${totalTasks} training phases.`}
      />

      {/* Progress Display */}
      <div className="px-5 pb-4">
        <div className="bg-[#000000]/30 rounded-xl p-4 border border-gray-600/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Final Progress</span>
            <span className="text-[#39BEAE] text-2xl font-bold">{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-[#39BEAE] h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Success Message */}
      <div className="p-3 rounded-xl mb-4 mx-5 bg-green-500/20 border border-green-500/40 text-green-300">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} />
          <span className="text-sm">All phases completed successfully!</span>
        </div>
      </div>

      {/* Action Buttons */}
      <ModalFooter>
        {isLti && role === 'student' && (
          <Button
          variant="secondary"
          onClick={handleExportReport}
          disabled={isExporting}
          leftIcon={<Download size={16} />}
        >
          {isExporting ? 'Exporting...' : 'Export Report'}
        </Button>
          
        )}
       
        <Button
          variant="primary"
          onClick={handleContinue}
          leftIcon={
            <Image
              src="/icons/arrow-right.png"
              alt=""
              width={18}
              height={18}
              style={{ width: 'auto', height: 'auto' }}
            />
          }
        >
          {getButtonText()}
        </Button>
      </ModalFooter>
    </BaseModal>
  )
}

export default TrainingCompleteModal
