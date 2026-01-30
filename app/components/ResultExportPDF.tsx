'use client'

/**
 * ResultExportPDF Component
 *
 * Generates a branded PDF training report for students
 * who complete training. Uses data from training_sessions
 * and quiz_responses tables.
 *
 * Layout:
 *   h2: "Training Report" (centered page header)
 *   h3: "Student Information" — table from training_sessions.student
 *   h3: "Session Information" — table from training_sessions columns
 *   h3: "Quiz Results" — table from quiz_responses.question_data
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { QuestionDataMap } from '@/app/types/quiz.types'

// =============================================================================
// Types — maps directly to training_sessions + quiz_responses tables
// =============================================================================

export interface ResultPDFData {
  // From training_sessions.student JSONB column
  student: {
    full_name: string
    email: string
    course_name: string
    institution: string
  }
  // From training_sessions columns
  session: {
    phases_completed: number   // training_sessions.phases_completed
    total_time_spent: number   // training_sessions.total_time_spent (seconds)
    overall_progress: number   // training_sessions.overall_progress (0-100)
  }
  // From quiz_responses.question_data JSONB column
  questionData: QuestionDataMap
}

// =============================================================================
// Theme Colors (matches app's CSS variables)
// =============================================================================

const COLORS = {
  teal: [57, 190, 174] as [number, number, number],       // #39BEAE
  tealLight: [121, 207, 194] as [number, number, number],  // #79CFC2
  navy: [13, 29, 64] as [number, number, number],          // #0D1D40
  white: [255, 255, 255] as [number, number, number],
  textPrimary: [13, 29, 64] as [number, number, number],
  textMuted: [107, 111, 138] as [number, number, number],  // #6B6F8A
  border: [217, 217, 217] as [number, number, number],     // #D9D9D9
  success: [34, 197, 94] as [number, number, number],      // green-500
  error: [223, 94, 94] as [number, number, number],        // #df5e5e
  rowAlt: [241, 248, 247] as [number, number, number],     // teal-tinted alt row
}

const TOTAL_PHASES = 6

// =============================================================================
// Helpers
// =============================================================================

function formatSeconds(seconds: number): string {
  if (!seconds || seconds === 0) return '0s'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
}

function formatMs(ms: number): string {
  if (!ms || ms === 0) return '0s'
  const totalSeconds = Math.round(ms / 1000)
  return formatSeconds(totalSeconds)
}

/**
 * Load image as base64 for PDF embedding
 * Uses fetch API which works reliably on Vercel deployments
 */
async function loadImageAsBase64(path: string): Promise<string> {
  try {
    // Use fetch to get the image as a blob - works reliably on Vercel
    const response = await fetch(path)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const blob = await response.blob()

    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to convert image to base64'))
        }
      }
      reader.onerror = () => reject(new Error('FileReader error'))
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error loading image for PDF:', path, error)
    throw error
  }
}

// =============================================================================
// PDF Generation
// =============================================================================

export async function generateResultPDF(data: ResultPDFData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = doc.internal.pageSize.getWidth()   // 210
  const pageH = doc.internal.pageSize.getHeight()   // 297
  const margin = 14

  // Load logo
  let logoBase64: string | null = null
  try {
    logoBase64 = await loadImageAsBase64('/logos/Dark_logo.png')
  } catch { /* logo optional */ }

  // =========================================================================
  // HEADER BAND — navy background with teal accent
  // =========================================================================

  const headerH = 38
  doc.setFillColor(...COLORS.navy)
  doc.rect(0, 0, pageW, headerH, 'F')

  // Teal accent line under header
  doc.setFillColor(...COLORS.teal)
  doc.rect(0, headerH, pageW, 1.5, 'F')

  // Logo in header (top-left)
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 8, 38, 9)
  }

  // h2: "Training Report" — centered main header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...COLORS.white)
  doc.text('Training Report', pageW / 2, 28, { align: 'center' })

  // Date on header (right side)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.tealLight)
  const dateStr = new Date().toLocaleDateString('en-NZ', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
  doc.text(dateStr, pageW - margin, 12, { align: 'right' })
  const timeStr = new Date().toLocaleTimeString('en-NZ', {
    hour: '2-digit', minute: '2-digit'
  })
  doc.text(`Generated at ${timeStr}`, pageW - margin, 17, { align: 'right' })

  let curY = headerH + 1.5 + 10

  // =========================================================================
  // SECTION 1 — Student Information (h3)
  // Data source: training_sessions.student JSONB column
  // =========================================================================

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...COLORS.navy)
  doc.text('Student Information', margin, curY)
  curY += 2

  autoTable(doc, {
    body: [
      ['Full Name', data.student.full_name || 'N/A'],
      ['Email', data.student.email || 'N/A'],
      ['Course', data.student.course_name || 'N/A'],
      ['Institution', data.student.institution || 'N/A'],
    ],
    startY: curY,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
      lineColor: COLORS.border,
      lineWidth: 0.2,
    },
    columnStyles: {
      0: {
        cellWidth: 45,
        fontStyle: 'bold',
        textColor: COLORS.textMuted,
        fillColor: COLORS.rowAlt,
      },
      1: {
        textColor: COLORS.textPrimary,
      },
    },
    tableLineColor: COLORS.border,
    tableLineWidth: 0.2,
    margin: { left: margin, right: margin },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curY = (doc as any).lastAutoTable.finalY + 10

  // =========================================================================
  // SECTION 2 — Session Information (h3)
  // Data source: training_sessions columns
  // =========================================================================

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...COLORS.navy)
  doc.text('Session Information', margin, curY)
  curY += 2

  const phasesDisplay = `${data.session.phases_completed} / ${TOTAL_PHASES}`
  const timeDisplay = formatSeconds(data.session.total_time_spent)
  const progressDisplay = `${Number(data.session.overall_progress).toFixed(0)}%`

  autoTable(doc, {
    body: [
      ['Phases Completed', phasesDisplay],
      ['Total Time Spent', timeDisplay],
      ['Progress', progressDisplay],
    ],
    startY: curY,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
      lineColor: COLORS.border,
      lineWidth: 0.2,
    },
    columnStyles: {
      0: {
        cellWidth: 45,
        fontStyle: 'bold',
        textColor: COLORS.textMuted,
        fillColor: COLORS.rowAlt,
      },
      1: {
        textColor: COLORS.textPrimary,
      },
    },
    tableLineColor: COLORS.border,
    tableLineWidth: 0.2,
    margin: { left: margin, right: margin },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curY = (doc as any).lastAutoTable.finalY + 10

  // =========================================================================
  // SECTION 3 — Quiz Results (h3)
  // Data source: quiz_responses.question_data JSONB column
  // =========================================================================

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...COLORS.navy)
  doc.text('Quiz Results', margin, curY)
  curY += 2

  // Build rows by mapping over question_data entries
  // Sort by question key to ensure consistent ordering (Q1, Q2, Q4, Q5, Q6)
  const sortedEntries = Object.entries(data.questionData)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))

  let totalCorrect = 0

  const quizRows = sortedEntries.map(([, entry], index) => {
    const score = entry.correct ? 1 : 0
    totalCorrect += score

    return [
      `${index + 1}`,                         // Sr
      entry.answer,                            // Answer (A, B, C, D)
      entry.correct ? 'Yes' : 'No',           // Correct
      formatMs(entry.time),                    // Time
      `${entry.attempts}`,                     // Total Attempts
      `${score}`,                              // Score (1 or 0)
    ]
  })

  autoTable(doc, {
    head: [['Sr', 'Answer', 'Correct', 'Time', 'Total Attempts', 'Score']],
    body: quizRows,
    startY: curY,
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      lineColor: COLORS.border,
      lineWidth: 0.2,
      halign: 'center',
    },
    headStyles: {
      fillColor: COLORS.navy,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: COLORS.textPrimary,
    },
    alternateRowStyles: {
      fillColor: COLORS.rowAlt,
    },
    didParseCell: (hookData) => {
      // Color the Correct column
      if (hookData.section === 'body' && hookData.column.index === 2) {
        const val = hookData.cell.raw as string
        if (val === 'Yes') {
          hookData.cell.styles.textColor = COLORS.success
          hookData.cell.styles.fontStyle = 'bold'
        } else {
          hookData.cell.styles.textColor = COLORS.error
          hookData.cell.styles.fontStyle = 'bold'
        }
      }
      // Color the Score column
      if (hookData.section === 'body' && hookData.column.index === 5) {
        const val = hookData.cell.raw as string
        if (val === '1') {
          hookData.cell.styles.textColor = COLORS.success
          hookData.cell.styles.fontStyle = 'bold'
        } else {
          hookData.cell.styles.textColor = COLORS.error
          hookData.cell.styles.fontStyle = 'bold'
        }
      }
    },
    margin: { left: margin, right: margin },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curY = (doc as any).lastAutoTable.finalY + 6

  // Total score summary line
  const totalQuestions = sortedEntries.length
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.navy)
  doc.text(`Total Score: ${totalCorrect} / ${totalQuestions}`, pageW - margin, curY, { align: 'right' })

  // =========================================================================
  // FOOTER — Page number + logo + accent line
  // =========================================================================

  const footerY = pageH - 16

  // Teal accent line above footer
  doc.setFillColor(...COLORS.teal)
  doc.rect(0, footerY - 2, pageW, 1, 'F')

  // Footer text
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.textMuted)
  doc.text('OP SkillSim — Plumbing Training Simulator', margin, footerY + 4)
  doc.text('Page 1 of 1', pageW / 2, footerY + 4, { align: 'center' })

  // Footer logo
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', pageW - margin - 35, footerY, 35, 8)
  }

  // =========================================================================
  // Save
  // =========================================================================

  const safeName = data.student.full_name.replace(/\s+/g, '_') || 'Student'
  doc.save(`${safeName}_Training_Report.pdf`)
}
