/**
 * Admin Utils
 *
 * Shared utility functions for admin pages.
 */

/**
 * Format a date string to a human-readable format
 */
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format seconds to a human-readable time string
 */
export function formatTime(seconds: number): string {
  if (!seconds || seconds === 0) return '0s'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}

/**
 * Format milliseconds to a human-readable time string
 */
export function formatTimeMs(ms: number): string {
  if (!ms || ms === 0) return '0s'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

/**
 * Format a timestamp to a relative time string (e.g., "2h ago")
 */
export function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

/**
 * Get initials from a name
 */
export function getInitials(name: string, maxLength = 2): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, maxLength)
    .toUpperCase()
}

/**
 * Format a phase string to title case with spaces
 */
export function formatPhase(phase: string): string {
  return phase
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

// =============================================================================
// PDF Export Utilities
// =============================================================================

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ExportColumn<T> {
  key: string
  header: string
  getValue?: (item: T) => unknown
  width?: number
}

export interface PDFExportOptions {
  title?: string
  subtitle?: string
  orientation?: 'portrait' | 'landscape'
}

/**
 * Load an image and convert to base64
 */
async function loadImageAsBase64(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      const dataUrl = canvas.toDataURL('image/png')
      resolve(dataUrl)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    // Use absolute URL based on current origin
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    img.src = `${baseUrl}${path}`
  })
}

/**
 * Export data to PDF and trigger download
 */
export async function exportToPDF<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  options: PDFExportOptions = {}
): Promise<void> {
  const {
    title = 'Export',
    subtitle,
    orientation = 'landscape'
  } = options

  // Create PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Try to load the logo
  let logoBase64: string | null = null
  try {
    logoBase64 = await loadImageAsBase64('/logos/Dark_Logo.png')
  } catch (error) {
    console.warn('Could not load logo for PDF:', error)
  }

  // Add title
  doc.setFontSize(18)
  doc.setTextColor(57, 190, 174) // #39BEAE
  doc.text(title, 14, 20)

  // Add subtitle if provided
  let startY = 28
  if (subtitle) {
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(subtitle, 14, startY)
    startY += 8
  }

  // Add timestamp
  doc.setFontSize(9)
  doc.setTextColor(128)
  const timestamp = new Date().toLocaleString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  doc.text(`Generated: ${timestamp}`, 14, startY)
  startY += 6

  // Add total count
  doc.text(`Total Records: ${data.length}`, 14, startY)
  startY += 8

  // Prepare table data
  const headers = columns.map(col => col.header)
  const rows = data.map(item =>
    columns.map(col => {
      const value = col.getValue
        ? col.getValue(item)
        : (item as Record<string, unknown>)[col.key]
      return value === null || value === undefined ? '' : String(value)
    })
  )

  // Generate table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: startY,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [57, 190, 174], // #39BEAE
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  })

  // Add footer with page numbers and logo
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )

    // Add logo to footer (right side)
    if (logoBase64) {
      // Logo dimensions: width ~40mm, maintain aspect ratio
      const logoWidth = 35
      const logoHeight = 8
      doc.addImage(
        logoBase64,
        'PNG',
        pageWidth - 14 - logoWidth,
        pageHeight - 14,
        logoWidth,
        logoHeight
      )
    }
  }

  // Save the PDF
  doc.save(filename)
}

// =============================================================================
// Chart Export Utilities
// =============================================================================

export interface ChartExportOptions {
  title: string
  subtitle?: string
  orientation?: 'portrait' | 'landscape'
}

/**
 * Export a chart element to PDF by capturing it as an image
 * Uses html-to-image which supports modern CSS including oklch
 */
export async function exportChartToPDF(
  chartElement: HTMLElement,
  filename: string,
  options: ChartExportOptions
): Promise<void> {
  const { title, subtitle, orientation = 'landscape' } = options

  // Dynamically import html-to-image (supports oklch colors)
  const { toPng } = await import('html-to-image')

  // Detect current theme by checking the html element's class or data attribute
  const isDarkTheme = document.documentElement.classList.contains('dark') ||
    document.documentElement.getAttribute('data-theme') === 'dark'

  // Use appropriate background color based on theme
  const backgroundColor = isDarkTheme ? '#1a1a2e' : '#ffffff'

  // Capture the chart as PNG
  const imgData = await toPng(chartElement, {
    backgroundColor,
    pixelRatio: 2,
  })

  // Create PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Try to load the logo (use opposite theme logo for visibility)
  let logoBase64: string | null = null
  try {
    const logoPath = isDarkTheme ? '/logos/Dark_Logo.png' : '/logos/Light_Logo.png'
    logoBase64 = await loadImageAsBase64(logoPath)
  } catch (error) {
    console.warn('Could not load logo for PDF:', error)
  }

  // PDF text colors based on theme
  const titleColor: [number, number, number] = [57, 190, 174] // Brand color works on both
  const subtitleColor: [number, number, number] = isDarkTheme ? [160, 160, 160] : [80, 80, 80]
  const mutedColor: [number, number, number] = isDarkTheme ? [128, 128, 128] : [100, 100, 100]

  // Add title
  doc.setFontSize(18)
  doc.setTextColor(...titleColor)
  doc.text(title, 14, 20)

  // Add subtitle if provided
  let startY = 28
  if (subtitle) {
    doc.setFontSize(11)
    doc.setTextColor(...subtitleColor)
    doc.text(subtitle, 14, startY)
    startY += 8
  }

  // Add timestamp
  doc.setFontSize(9)
  doc.setTextColor(...mutedColor)
  const timestamp = new Date().toLocaleString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  doc.text(`Generated: ${timestamp}`, 14, startY)
  startY += 10

  // Calculate image dimensions to fit the page
  const maxWidth = pageWidth - 28
  const maxHeight = pageHeight - startY - 20

  // Get original element dimensions (pixelRatio of 2 was used)
  const imgWidth = chartElement.offsetWidth * 2
  const imgHeight = chartElement.offsetHeight * 2
  const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight)

  const finalWidth = imgWidth * ratio
  const finalHeight = imgHeight * ratio

  // Center the image horizontally
  const xOffset = (pageWidth - finalWidth) / 2

  // Add the chart image
  doc.addImage(imgData, 'PNG', xOffset, startY, finalWidth, finalHeight)

  // Add footer
  doc.setFontSize(8)
  doc.setTextColor(...mutedColor)
  doc.text('Page 1 of 1', pageWidth / 2, pageHeight - 8, { align: 'center' })

  // Add logo to footer
  if (logoBase64) {
    const logoWidth = 35
    const logoHeight = 8
    doc.addImage(
      logoBase64,
      'PNG',
      pageWidth - 14 - logoWidth,
      pageHeight - 12,
      logoWidth,
      logoHeight
    )
  }

  // Save the PDF
  doc.save(filename)
}
