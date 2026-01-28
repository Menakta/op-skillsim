'use client'

/**
 * ResultExportPDF Component
 *
 * Generates a branded PDF certificate/report for students
 * who complete all training phases. Includes student info,
 * phase progress, quiz performance, and per-question timing.
 *
 * Uses jsPDF to build a PDF that matches the app's teal/navy theme.
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { QUESTION_DATABASE, QUESTION_IDS } from '@/app/config/questions.config'
import { TASK_SEQUENCE } from '@/app/config/tasks.config'
import type { QuestionDataMap } from '@/app/types/quiz.types'
import { keyToQuestionId } from '@/app/types/quiz.types'

// =============================================================================
// Types
// =============================================================================

export interface StudentResultData {
  firstName: string
  lastName: string
  institution: string
  totalPhases: number
  phasesCompleted: number
  totalQuizzes: number
  quizzesCompleted: number
  totalTimeSpentMs: number
  questionData: QuestionDataMap
}

// =============================================================================
// Theme Colors (matches app's CSS variables)
// =============================================================================

const COLORS = {
  teal: [57, 190, 174] as [number, number, number],       // #39BEAE
  tealLight: [121, 207, 194] as [number, number, number],  // #79CFC2
  navy: [13, 29, 64] as [number, number, number],          // #0D1D40
  navySecondary: [62, 66, 95] as [number, number, number], // #3E425F
  white: [255, 255, 255] as [number, number, number],
  bgLight: [238, 238, 238] as [number, number, number],    // #eeeeee
  bgCard: [247, 248, 250] as [number, number, number],     // #F7F8FA
  textPrimary: [13, 29, 64] as [number, number, number],   // navy
  textSecondary: [62, 66, 95] as [number, number, number], // #3E425F
  textMuted: [107, 111, 138] as [number, number, number],  // #6B6F8A
  border: [217, 217, 217] as [number, number, number],     // #D9D9D9
  success: [34, 197, 94] as [number, number, number],      // green-500
  error: [223, 94, 94] as [number, number, number],        // #df5e5e
  rowAlt: [241, 248, 247] as [number, number, number],     // teal-tinted alt row
}

// =============================================================================
// Helpers
// =============================================================================

function formatMs(ms: number): string {
  if (!ms || ms === 0) return '0s'
  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
}

async function loadImageAsBase64(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('No canvas context')); return }
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    img.src = `${baseUrl}${path}`
  })
}

// =============================================================================
// Rounded Rectangle Helper
// =============================================================================

function drawRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: [number, number, number],
  stroke?: [number, number, number]
) {
  doc.setFillColor(...fill)
  if (stroke) {
    doc.setDrawColor(...stroke)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, w, h, r, r, 'FD')
  } else {
    doc.roundedRect(x, y, w, h, r, r, 'F')
  }
}

// =============================================================================
// PDF Generation
// =============================================================================

export async function generateResultPDF(data: StudentResultData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = doc.internal.pageSize.getWidth()   // 210
  const pageH = doc.internal.pageSize.getHeight()   // 297
  const margin = 14
  const contentW = pageW - margin * 2

  // Load logo
  let logoBase64: string | null = null
  try {
    logoBase64 = await loadImageAsBase64('/logos/Dark_Logo.png')
  } catch { /* logo optional */ }

  // =========================================================================
  // HEADER BAND — navy background with teal accent
  // =========================================================================

  const headerH = 44
  doc.setFillColor(...COLORS.navy)
  doc.rect(0, 0, pageW, headerH, 'F')

  // Teal accent line under header
  doc.setFillColor(...COLORS.teal)
  doc.rect(0, headerH, pageW, 1.5, 'F')

  // Logo in header (top-left)
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 8, 38, 9)
  }

  // Title text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...COLORS.white)
  doc.text('Training Results Report', margin, 30)

  // Date on header (right side)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.tealLight)
  const dateStr = new Date().toLocaleDateString('en-NZ', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
  doc.text(dateStr, pageW - margin, 14, { align: 'right' })

  // Timestamp
  const timeStr = new Date().toLocaleTimeString('en-NZ', {
    hour: '2-digit', minute: '2-digit'
  })
  doc.text(`Generated at ${timeStr}`, pageW - margin, 20, { align: 'right' })

  let curY = headerH + 1.5 + 10

  // =========================================================================
  // SECTION 1 — Student Information Card
  // =========================================================================

  const cardH = 32
  drawRoundedRect(doc, margin, curY, contentW, cardH, 3, COLORS.bgCard, COLORS.border)

  // Section label
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.teal)
  doc.text('Student Information', margin + 5, curY + 7)

  // Divider line inside card
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.2)
  doc.line(margin + 5, curY + 10, margin + contentW - 5, curY + 10)

  // Student details (two columns)
  const col1X = margin + 5
  const col2X = margin + contentW / 2 + 5
  const detailY = curY + 17

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  // Left column
  doc.setTextColor(...COLORS.textMuted)
  doc.text('First Name', col1X, detailY)
  doc.setTextColor(...COLORS.textPrimary)
  doc.setFont('helvetica', 'bold')
  doc.text(data.firstName || 'N/A', col1X + 28, detailY)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.textMuted)
  doc.text('Last Name', col1X, detailY + 7)
  doc.setTextColor(...COLORS.textPrimary)
  doc.setFont('helvetica', 'bold')
  doc.text(data.lastName || 'N/A', col1X + 28, detailY + 7)

  // Right column
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.textMuted)
  doc.text('Institution', col2X, detailY)
  doc.setTextColor(...COLORS.textPrimary)
  doc.setFont('helvetica', 'bold')
  doc.text(data.institution || 'N/A', col2X + 28, detailY)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.textMuted)
  doc.text('Total Time', col2X, detailY + 7)
  doc.setTextColor(...COLORS.textPrimary)
  doc.setFont('helvetica', 'bold')
  doc.text(formatMs(data.totalTimeSpentMs), col2X + 28, detailY + 7)

  curY += cardH + 8

  // =========================================================================
  // SECTION 2 — Training Overview (3 stat cards)
  // =========================================================================

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.teal)
  doc.text('Training Overview', margin, curY + 1)
  curY += 6

  const statCardW = (contentW - 8) / 3   // 3 cards with gaps
  const statCardH = 28
  const gap = 4

  const stats = [
    {
      label: 'Phases',
      value: `${data.phasesCompleted} / ${data.totalPhases}`,
      sub: data.phasesCompleted === data.totalPhases ? 'All Complete' : 'In Progress',
      color: data.phasesCompleted === data.totalPhases ? COLORS.success : COLORS.teal,
    },
    {
      label: 'Quizzes',
      value: `${data.quizzesCompleted} / ${data.totalQuizzes}`,
      sub: data.quizzesCompleted === data.totalQuizzes ? 'All Answered' : 'Partial',
      color: data.quizzesCompleted === data.totalQuizzes ? COLORS.success : COLORS.teal,
    },
    {
      label: 'Total Time',
      value: formatMs(data.totalTimeSpentMs),
      sub: 'Session Duration',
      color: COLORS.teal,
    }
  ]

  stats.forEach((stat, i) => {
    const sx = margin + i * (statCardW + gap)

    // Card background
    drawRoundedRect(doc, sx, curY, statCardW, statCardH, 3, COLORS.white, COLORS.border)

    // Teal top accent
    doc.setFillColor(...stat.color)
    // Draw a small bar at top of card
    doc.roundedRect(sx, curY, statCardW, 3, 3, 3, 'F')
    // Fill the bottom part that got rounded
    doc.rect(sx, curY + 1.5, statCardW, 1.5, 'F')

    // Label
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.textMuted)
    doc.text(stat.label, sx + statCardW / 2, curY + 10, { align: 'center' })

    // Value
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...COLORS.navy)
    doc.text(stat.value, sx + statCardW / 2, curY + 19, { align: 'center' })

    // Sub-label
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...stat.color)
    doc.text(stat.sub, sx + statCardW / 2, curY + 24, { align: 'center' })
  })

  curY += statCardH + 10

  // =========================================================================
  // SECTION 3 — Training Phases Table
  // =========================================================================

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.teal)
  doc.text('Training Phases', margin, curY + 1)
  curY += 4

  const phaseRows = TASK_SEQUENCE.map((task, idx) => {
    const completed = idx < data.phasesCompleted
    return [
      `Phase ${idx + 1}`,
      task.name,
      task.description,
      completed ? 'Completed' : 'Not Completed',
    ]
  })

  autoTable(doc, {
    head: [['Phase', 'Task Name', 'Description', 'Status']],
    body: phaseRows,
    startY: curY,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: COLORS.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLORS.navy,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      textColor: COLORS.textPrimary,
    },
    alternateRowStyles: {
      fillColor: COLORS.rowAlt,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 36 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 28, halign: 'center' },
    },
    didParseCell: (hookData) => {
      // Color the status column
      if (hookData.section === 'body' && hookData.column.index === 3) {
        const val = hookData.cell.raw as string
        if (val === 'Completed') {
          hookData.cell.styles.textColor = COLORS.success
          hookData.cell.styles.fontStyle = 'bold'
        } else {
          hookData.cell.styles.textColor = COLORS.error
        }
      }
    },
    margin: { left: margin, right: margin },
  })

  // Get Y after table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curY = (doc as any).lastAutoTable.finalY + 10

  // =========================================================================
  // SECTION 4 — Quiz Performance Table
  // =========================================================================

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.teal)
  doc.text('Quiz Performance', margin, curY + 1)
  curY += 4

  // Build quiz rows from questionData
  const quizRows: string[][] = []
  let totalAttempts = 0
  let totalCorrect = 0
  let totalQuizTimeMs = 0

  QUESTION_IDS.forEach((qId) => {
    const qConfig = QUESTION_DATABASE[qId]
    // Find matching entry in questionData
    let entry = null
    for (const [key, val] of Object.entries(data.questionData)) {
      const resolvedId = keyToQuestionId(key)
      if (resolvedId === qId) {
        entry = val
        break
      }
    }

    if (entry) {
      totalAttempts += entry.attempts
      totalQuizTimeMs += entry.time
      if (entry.correct) totalCorrect++

      quizRows.push([
        qId,
        qConfig?.name || qId,
        entry.correct ? 'Correct' : 'Incorrect',
        `${entry.attempts}`,
        formatMs(entry.time),
      ])
    } else {
      quizRows.push([
        qId,
        qConfig?.name || qId,
        'Not Answered',
        '-',
        '-',
      ])
    }
  })

  autoTable(doc, {
    head: [['Quiz', 'Topic', 'Result', 'Attempts', 'Time Spent']],
    body: quizRows,
    startY: curY,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: COLORS.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLORS.navy,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      textColor: COLORS.textPrimary,
    },
    alternateRowStyles: {
      fillColor: COLORS.rowAlt,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 36 },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 26, halign: 'center' },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 2) {
        const val = hookData.cell.raw as string
        if (val === 'Correct') {
          hookData.cell.styles.textColor = COLORS.success
          hookData.cell.styles.fontStyle = 'bold'
        } else if (val === 'Incorrect') {
          hookData.cell.styles.textColor = COLORS.error
          hookData.cell.styles.fontStyle = 'bold'
        } else {
          hookData.cell.styles.textColor = COLORS.textMuted
        }
      }
    },
    margin: { left: margin, right: margin },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curY = (doc as any).lastAutoTable.finalY + 8

  // =========================================================================
  // SECTION 5 — Quiz Summary Bar
  // =========================================================================

  const summaryH = 16
  drawRoundedRect(doc, margin, curY, contentW, summaryH, 3, COLORS.navy)

  const summaryItems = [
    { label: 'Score', value: `${totalCorrect} / ${QUESTION_IDS.length}` },
    { label: 'Accuracy', value: `${QUESTION_IDS.length > 0 ? Math.round((totalCorrect / QUESTION_IDS.length) * 100) : 0}%` },
    { label: 'Total Attempts', value: `${totalAttempts}` },
    { label: 'Total Quiz Time', value: formatMs(totalQuizTimeMs) },
  ]

  const summaryColW = contentW / summaryItems.length
  summaryItems.forEach((item, i) => {
    const sx = margin + i * summaryColW + summaryColW / 2

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.tealLight)
    doc.text(item.label, sx, curY + 6, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...COLORS.white)
    doc.text(item.value, sx, curY + 13, { align: 'center' })
  })

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

  const filename = `${data.firstName}_${data.lastName}_Training_Results.pdf`
    .replace(/\s+/g, '_')
  doc.save(filename)
}
